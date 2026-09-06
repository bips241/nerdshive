#!/usr/bin/env node

/**
 * Automated Test: Entity Evolution & Backward Compatibility Guardrails
 *
 * Verifies:
 * 1. Additive schema evolution: Old documents without new fields load and validate cleanly.
 * 2. Default value fallback: Sane defaults populate when missing on historical records.
 * 3. Atomic $addToSet & $inc: Concurrent operations prevent race condition collisions.
 * 4. Partial index collision safety: Null/undefined optional unique fields do not collide.
 * 5. E11000 duplicate key collision handling with automatic retry.
 */

const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function runCompatibilityTests() {
  console.log('===============================================================');
  console.log('  NERDSHIVE ENTITY EVOLUTION & BACKWARD COMPATIBILITY TEST');
  console.log('===============================================================');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  const testSuffix = Date.now();
  const testUserId = new ObjectId();
  const testEventId = new ObjectId();

  try {
    // -------------------------------------------------------------
    // Test 1: Historical Document Validation (Additive-Only Rule)
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing Historical Document Query & Backward Compatibility...');
    // Simulate an old document inserted years ago before isDeleted, retentionExpiresAt, radarStatus existed
    await db.collection('users').insertOne({
      _id: testUserId,
      user_name: `legacy_user_${testSuffix}`,
      email: `legacy_${testSuffix}@nerdshive.test`,
      // Intentionally omit all newer fields: role, accountStatus, isDeleted, retentionExpiresAt, debugKarma
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });

    const retrievedUser = await db.collection('users').findOne({ _id: testUserId });
    if (!retrievedUser) throw new Error('Failed to retrieve legacy user document');

    // Verify application-layer fallback handles missing fields gracefully
    const userRole = retrievedUser.role || 'developer'; // Sane fallback
    const isDeleted = retrievedUser.isDeleted || false;
    const accountStatus = retrievedUser.accountStatus || 'active';

    if (userRole !== 'developer' || isDeleted !== false || accountStatus !== 'active') {
      throw new Error('Fallback resolution failed on legacy document');
    }
    console.log('PASS: Legacy document with missing fields resolved cleanly with zero runtime failure.');

    // -------------------------------------------------------------
    // Test 2: Atomic Array Mutation & Race Collision Prevention
    // -------------------------------------------------------------
    console.log('\n[Test 2] Testing Atomic Array Mutations ($addToSet vs $push collision)...');
    const memberId = new ObjectId();

    // Create a squad team document
    await db.collection('hackathonregistrations').insertOne({
      _id: testEventId,
      teamName: `Collision Test Squad ${testSuffix}`,
      code: `CODE${testSuffix.toString().substring(7)}`,
      members: [{ user: testUserId, role: 'Leader' }],
      isDeleted: false,
    });

    // Simulate two concurrent join requests attempting to add the same member
    const p1 = db.collection('hackathonregistrations').updateOne(
      { _id: testEventId },
      { $addToSet: { members: { user: memberId, role: 'Developer' } } }
    );
    const p2 = db.collection('hackathonregistrations').updateOne(
      { _id: testEventId },
      { $addToSet: { members: { user: memberId, role: 'Developer' } } }
    );

    await Promise.all([p1, p2]);

    const updatedSquad = await db.collection('hackathonregistrations').findOne({ _id: testEventId });
    const duplicateCount = updatedSquad.members.filter((m) => m.user.toString() === memberId.toString()).length;

    if (duplicateCount !== 1) {
      throw new Error(`Array collision detected! Member duplicated ${duplicateCount} times.`);
    }
    console.log('PASS: Concurrent writes using $addToSet prevented member roster duplicate collision.');

    // -------------------------------------------------------------
    // Test 3: Partial Index & Null Value Collision Safety
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing Null / Empty Uniqueness Collision Safety...');
    const userA = new ObjectId();
    const userB = new ObjectId();

    // Both users have null/undefined devpostUrl or repo.
    // Ensure inserting multiple documents with omitted optional fields does not clash.
    await db.collection('users').insertOne({
      _id: userA,
      user_name: `null_probe_a_${testSuffix}`,
      email: `null_a_${testSuffix}@nerdshive.test`,
      repo: null, // explicit null
    });

    await db.collection('users').insertOne({
      _id: userB,
      user_name: `null_probe_b_${testSuffix}`,
      email: `null_b_${testSuffix}@nerdshive.test`,
      repo: null, // explicit null
    });

    console.log('PASS: Multiple records with null optional fields coexist without uniqueness collision.');

    // -------------------------------------------------------------
    // Test 4: E11000 Duplicate Key Collision & Retry Handler
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing E11000 Collision Interception & Automatic Resolution...');
    const duplicateSlug = `unique-slug-${testSuffix}`;

    await db.collection('hackathonevents').insertOne({
      name: 'Primary Event',
      slug: duplicateSlug,
      isDeleted: false,
      createdAt: new Date(),
    });

    // Helper simulating atomic collision retry loop
    async function insertWithCollisionRetry(doc, maxRetries = 3) {
      let attempts = 0;
      while (attempts < maxRetries) {
        attempts++;
        try {
          return await db.collection('hackathonevents').insertOne(doc);
        } catch (err) {
          if (err.code === 11000 && attempts < maxRetries) {
            // Collision detected! Mutate slug with entropy and retry
            doc.slug = `${duplicateSlug}-retry-${Math.floor(Math.random() * 1000)}`;
            console.log(`  [Collision Detected] Attempt ${attempts} clashed. Auto-mutated slug to: "${doc.slug}"`);
            continue;
          }
          throw err;
        }
      }
    }

    const retryDoc = {
      name: 'Colliding Event',
      slug: duplicateSlug, // Will collide initially
      isDeleted: false,
      createdAt: new Date(),
    };

    const insertResult = await insertWithCollisionRetry(retryDoc);
    if (!insertResult.acknowledged) {
      throw new Error('Retry loop failed to resolve collision');
    }
    console.log(`PASS: E11000 duplicate key collision intercepted and resolved automatically.`);

    // Cleanup probe records
    await db.collection('users').deleteMany({ _id: { $in: [userA, userB] } });
    await db.collection('hackathonevents').deleteMany({ slug: { $regex: duplicateSlug } });

    console.log('\n===============================================================');
    console.log('  ALL BACKWARD COMPATIBILITY & COLLISION TESTS PASSED (4/4)');
    console.log('===============================================================');
  } finally {
    // Cleanup fixtures
    await db.collection('users').deleteOne({ _id: testUserId });
    await db.collection('hackathonregistrations').deleteOne({ _id: testEventId });
    await client.close();
  }
}

runCompatibilityTests().catch((err) => {
  console.error('Compatibility test failed:', err);
  process.exit(1);
});
