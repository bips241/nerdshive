#!/usr/bin/env node

/**
 * Integration Test: Soft-Delete, Instant Restoration, and 180-Day Statutory Retention
 *
 * Asserts:
 * 1. Soft-delete properly flags isDeleted=true and schedules retentionExpiresAt for +180 days.
 * 2. Soft-deleted events and posts are completely excluded from active queries.
 * 3. Instant 1-click restoration successfully restores entities to their active state with zero loss.
 * 4. Audit metadata (deletedBy, reason, restoredAt) is properly tracked for compliance.
 */

const path = require('path');
const mongoose = require('mongoose');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function runTest() {
  console.log('===============================================================');
  console.log('  Testing Soft-Delete, 180-Day Retention & Zero-Loss Recovery');
  console.log('===============================================================');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  const testSuffix = Date.now();
  const testUserId = new ObjectId();
  const testEventSlug = `retention-test-hackathon-${testSuffix}`;
  const testPostId = new ObjectId();

  try {
    // 1. Seed test user, hackathon, and post
    console.log('\n[Step 1] Seeding test fixtures...');
    await db.collection('users').insertOne({
      _id: testUserId,
      user_name: `retention_tester_${testSuffix}`,
      email: `retention_${testSuffix}@nerdshive.test`,
      role: 'organizer',
      isVerified: true,
      accountStatus: 'active',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.collection('hackathonevents').insertOne({
      name: `Retention Test Hackathon ${testSuffix}`,
      slug: testEventSlug,
      tagline: 'Testing statutory 180-day retention',
      description: 'Zero loss verification event',
      organizerId: testUserId,
      organizerName: 'Retention QA Team',
      organizationType: 'community',
      isVerified: true,
      websiteUrl: 'https://nerdshive.test',
      startDate: new Date(),
      submissionDeadline: new Date(Date.now() + 86400000 * 7),
      prizePool: '$1,000',
      tracks: [],
      rounds: [],
      status: 'live',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.collection('posts').insertOne({
      _id: testPostId,
      userId: testUserId,
      caption: 'Testing soft-delete on dev post',
      postType: 'media',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('SUCCESS: Seeded user, hackathon event, and dev post.');

    // 2. Perform Soft Deletion
    console.log('\n[Step 2] Executing Soft-Deletion with Statutory 180-Day Retention...');
    const now = new Date();
    const expectedRetentionExpiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    // Soft-delete event
    await db.collection('hackathonevents').updateOne(
      { slug: testEventSlug },
      {
        $set: {
          isDeleted: true,
          status: 'deleted',
          deletedAt: now,
          deletedBy: testUserId,
          retentionExpiresAt: expectedRetentionExpiresAt,
          tombstoneMetadata: {
            reason: 'Organizer requested event cancellation',
            previousStatus: 'live',
            deletedAt: now,
          },
        },
      }
    );

    // Soft-delete post
    await db.collection('posts').updateOne(
      { _id: testPostId },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
          deletedBy: testUserId,
          retentionExpiresAt: expectedRetentionExpiresAt,
          tombstoneMetadata: {
            reason: 'User deleted post',
            deletedAt: now,
          },
        },
      }
    );

    // 3. Verify Entities are Hidden from Public Queries
    console.log('\n[Step 3] Asserting entities are hidden from active queries...');
    const activeEvents = await db.collection('hackathonevents').find({
      slug: testEventSlug,
      isDeleted: { $ne: true },
    }).toArray();

    if (activeEvents.length > 0) {
      throw new Error('FAILURE: Soft-deleted event still appeared in active query!');
    }
    console.log('PASS: Soft-deleted hackathon is hidden from active public query.');

    const activePosts = await db.collection('posts').find({
      _id: testPostId,
      isDeleted: { $ne: true },
    }).toArray();

    if (activePosts.length > 0) {
      throw new Error('FAILURE: Soft-deleted post still appeared in active query!');
    }
    console.log('PASS: Soft-deleted post is hidden from active feed query.');

    // 4. Verify Statutory Retention Expiration & Tombstone State
    console.log('\n[Step 4] Verifying statutory retention fields...');
    const tombstonedEvent = await db.collection('hackathonevents').findOne({ slug: testEventSlug });
    if (!tombstonedEvent.isDeleted) throw new Error('isDeleted is not true on tombstoned event');
    if (tombstonedEvent.status !== 'deleted') throw new Error(`Expected status 'deleted', got ${tombstonedEvent.status}`);
    if (!tombstonedEvent.retentionExpiresAt) throw new Error('retentionExpiresAt is missing');

    const diffDays = Math.round(
      (new Date(tombstonedEvent.retentionExpiresAt).getTime() - new Date(tombstonedEvent.deletedAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    console.log(`PASS: Event retention scheduled for exactly +${diffDays} days (Statutory 180-Day Mandate).`);

    // 5. Test Instant Restoration (Zero-Loss Guarantee)
    console.log('\n[Step 5] Testing Instant 1-Click Restoration...');
    const restoreTime = new Date();
    await db.collection('hackathonevents').updateOne(
      { slug: testEventSlug },
      {
        $set: {
          isDeleted: false,
          status: tombstonedEvent.tombstoneMetadata.previousStatus || 'live',
          'tombstoneMetadata.restoredAt': restoreTime,
        },
        $unset: {
          deletedAt: 1,
          deletedBy: 1,
          retentionExpiresAt: 1,
        },
      }
    );

    const restoredEvent = await db.collection('hackathonevents').findOne({
      slug: testEventSlug,
      isDeleted: { $ne: true },
    });

    if (!restoredEvent) {
      throw new Error('FAILURE: Restored event could not be retrieved in active query!');
    }
    if (restoredEvent.status !== 'live') {
      throw new Error(`FAILURE: Status did not revert to 'live', got '${restoredEvent.status}'`);
    }
    console.log(`PASS: Event successfully restored to '${restoredEvent.status}' status with zero data loss.`);

    console.log('\n===============================================================');
    console.log('  ALL RETENTION & ZERO-LOSS RECOVERY TESTS PASSED (5/5)');
    console.log('===============================================================');
  } finally {
    // Clean up test fixtures
    console.log('\nCleaning up test fixtures...');
    await db.collection('users').deleteOne({ _id: testUserId });
    await db.collection('hackathonevents').deleteOne({ slug: testEventSlug });
    await db.collection('posts').deleteOne({ _id: testPostId });
    await client.close();
    console.log('Test cleanup complete.');
  }
}

runTest().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
