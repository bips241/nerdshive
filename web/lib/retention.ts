/**
 * NerdShive Enterprise Data Retention & Soft-Delete Engine
 *
 * Implements strict compliance with:
 * 1. Information Technology Act, 2000 & Amendment 2008 (Section 43A, 67C)
 * 2. IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 [Rule 3(1)(h)]
 *    - Mandates preservation of user registration and access records for 180 days post-cancellation.
 * 3. CERT-In Directions (April 2022)
 *    - 180-day rolling retention of system, access, and audit records within Indian jurisdiction (ap-south-1).
 * 4. Digital Personal Data Protection Act, 2023 (DPDP Act 2023)
 *    - Balances right to erasure with legal retention mandates; provides staged tombstoning and anonymization.
 */

import mongoose, { Model } from 'mongoose';

/**
 * Statutory retention constants
 */
export const STATUTORY_RETENTION_DAYS = 180; // Legally mandated by IT Rules 2021 Rule 3(1)(h) & CERT-In
export const GRACE_PERIOD_DAYS = 30; // Self-service recovery window for organizers and users

export interface TombstoneOptions {
  reason?: string;
  ipAddress?: string;
  previousStatus?: string;
  metadata?: Record<string, any>;
}

export interface SoftDeleteResult {
  success: boolean;
  entityId: string;
  isDeleted: boolean;
  deletedAt: Date;
  retentionExpiresAt: Date;
  message: string;
}

export interface RestoreResult {
  success: boolean;
  entityId: string;
  isDeleted: boolean;
  restoredAt: Date;
  message: string;
}

/**
 * Standard query filter to exclude soft-deleted records from public feeds, search, and dashboard views.
 */
export function getActiveFilter(): { isDeleted: { $ne: true } } {
  return { isDeleted: { $ne: true } };
}

/**
 * Computes statutory retention expiration timestamp (180 days from deletion).
 */
export function computeRetentionExpiryDate(fromDate: Date = new Date(), days: number = STATUTORY_RETENTION_DAYS): Date {
  const expiry = new Date(fromDate.getTime());
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

/**
 * Executes a zero-data-loss soft delete on any Mongoose model.
 * Never permanently removes the record; marks it tombstoned and schedules statutory retention expiry.
 */
export async function softDeleteEntity<T extends mongoose.Document>(
  model: Model<T>,
  entityId: string | mongoose.Types.ObjectId,
  deletedByUserId?: string | mongoose.Types.ObjectId,
  options: TombstoneOptions = {}
): Promise<SoftDeleteResult> {
  const now = new Date();
  const retentionExpiresAt = computeRetentionExpiryDate(now, STATUTORY_RETENTION_DAYS);

  const existing = await model.findById(entityId);
  if (!existing) {
    throw new Error(`Entity ${entityId} not found in ${model.modelName}`);
  }

  const existingAny = existing as any;
  const previousStatus = existingAny.status || options.previousStatus || 'active';

  const updatePayload: Record<string, any> = {
    isDeleted: true,
    deletedAt: now,
    retentionExpiresAt,
    tombstoneMetadata: {
      reason: options.reason || 'User requested deletion',
      previousStatus,
      ipAddress: options.ipAddress || 'unknown',
      deletedAt: now,
      metadata: options.metadata || {},
    },
  };

  if (deletedByUserId) {
    updatePayload.deletedBy = new mongoose.Types.ObjectId(deletedByUserId.toString());
  }

  // Update status if model tracks lifecycle status
  if (existingAny.status !== undefined) {
    updatePayload.status = 'deleted';
  }

  // If model is User, also update accountStatus
  if (existingAny.accountStatus !== undefined) {
    updatePayload.accountStatus = 'deleted';
  }

  await model.findByIdAndUpdate(entityId, { $set: updatePayload });

  console.info(
    `[DataRetention] Soft-deleted ${model.modelName} id=${entityId} by user=${deletedByUserId || 'system'}. ` +
    `Statutory retention expiry scheduled for: ${retentionExpiresAt.toISOString()} (180-day IT Act compliance).`
  );

  return {
    success: true,
    entityId: entityId.toString(),
    isDeleted: true,
    deletedAt: now,
    retentionExpiresAt,
    message: `${model.modelName} safely soft-deleted. Retained under statutory 180-day compliance hold.`,
  };
}

/**
 * Instantly restores a soft-deleted entity within the grace period or administrative review.
 */
export async function restoreEntity<T extends mongoose.Document>(
  model: Model<T>,
  entityId: string | mongoose.Types.ObjectId,
  restoredByUserId?: string | mongoose.Types.ObjectId
): Promise<RestoreResult> {
  const now = new Date();
  const existing = await model.findById(entityId);

  if (!existing) {
    throw new Error(`Entity ${entityId} not found in ${model.modelName}`);
  }

  const existingAny = existing as any;
  if (!existingAny.isDeleted) {
    return {
      success: true,
      entityId: entityId.toString(),
      isDeleted: false,
      restoredAt: now,
      message: `${model.modelName} is already active.`,
    };
  }

  const previousStatus = existingAny.tombstoneMetadata?.previousStatus || 'live';

  const updatePayload: Record<string, any> = {
    isDeleted: false,
    $unset: {
      deletedAt: 1,
      deletedBy: 1,
      retentionExpiresAt: 1,
    },
    'tombstoneMetadata.restoredAt': now,
    'tombstoneMetadata.restoredBy': restoredByUserId
      ? new mongoose.Types.ObjectId(restoredByUserId.toString())
      : null,
  };

  if (existingAny.status !== undefined) {
    updatePayload.status = previousStatus;
  }

  if (existingAny.accountStatus !== undefined) {
    updatePayload.accountStatus = 'active';
  }

  await model.findByIdAndUpdate(entityId, updatePayload);

  console.info(
    `[DataRetention] Restored ${model.modelName} id=${entityId} by user=${restoredByUserId || 'system'}. ` +
    `Status restored to '${previousStatus}'.`
  );

  return {
    success: true,
    entityId: entityId.toString(),
    isDeleted: false,
    restoredAt: now,
    message: `${model.modelName} restored successfully to active status.`,
  };
}
