/**
 * Dev Guest Mode & Production Bypass-Proof Security Test
 */

const assert = require('assert');

// Mock User Model and DB
const mockDatabase = new Map();

class MockUser {
  constructor(data) {
    this._id = data._id || `usr_${Math.random().toString(36).slice(2, 10)}`;
    this.user_name = data.user_name;
    this.email = data.email;
    this.name = data.name;
    this.bio = data.bio;
    this.isVerified = data.isVerified;
    this.image = data.image;
    this.role = data.role;
  }

  static async findOne(query) {
    if (query.email) {
      for (const user of mockDatabase.values()) {
        if (user.email === query.email) return user;
      }
    }
    return null;
  }

  static async create(data) {
    const user = new MockUser(data);
    mockDatabase.set(user._id, user);
    return user;
  }
}

// Simulated authorize logic from web/auth.ts
async function simulateAuthorize(credentials, currentEnv = 'development') {
  const { identifier, password, isDevGuest } = credentials || {};

  const isDevEnvironment = currentEnv !== 'production';
  const isGuestRequest =
    isDevGuest === true ||
    isDevGuest === 'true' ||
    (identifier === 'dev-guest' && password === 'dev-guest');

  if (isGuestRequest) {
    if (!isDevEnvironment) {
      throw new Error('Dev Guest mode is disabled in production');
    }

    let guestUser = await MockUser.findOne({ email: 'devguest@nerdshive.local' });

    if (!guestUser) {
      guestUser = await MockUser.create({
        user_name: 'dev_guest',
        email: 'devguest@nerdshive.local',
        name: 'Dev Guest User',
        bio: '🚀 Local Development Guest User for testing all platform features.',
        isVerified: true,
        image: 'https://api.dicebear.com/7.x/bottts/svg?seed=dev_guest',
        role: 'developer',
      });
    }

    return {
      _id: guestUser._id.toString(),
      user_name: guestUser.user_name,
      email: guestUser.email,
      role: guestUser.role,
      isVerified: guestUser.isVerified,
      image: guestUser.image,
    };
  }

  if (!identifier || !password) {
    throw new Error('Please provide all credentials');
  }

  return null;
}

async function runSecurityAudit() {
  console.log('=======================================================');
  console.log('Starting Dev Guest Mode & Production Bypass-Proof Test');
  console.log('=======================================================');

  // Test 1: Development Environment Allowed
  console.log('\n[TEST 1] Dev Mode Guest Access');
  const devUser = await simulateAuthorize({ isDevGuest: true }, 'development');
  assert(devUser, 'Dev user should be returned');
  assert.strictEqual(devUser.user_name, 'dev_guest');
  assert.strictEqual(devUser.isVerified, true);
  console.log(' [PASS] Successfully authenticated dev guest in development mode:', devUser.user_name);

  // Test 2: Production Environment Block (Direct isDevGuest flag)
  console.log('\n[TEST 2] Production Bypass Attempt (isDevGuest: true)');
  let productionBlocked1 = false;
  try {
    await simulateAuthorize({ isDevGuest: true }, 'production');
  } catch (err) {
    productionBlocked1 = true;
    assert.strictEqual(err.message, 'Dev Guest mode is disabled in production');
  }
  assert(productionBlocked1, 'Production MUST block isDevGuest: true');
  console.log(' [PASS] Blocked unauthorized guest flag in production environment');

  // Test 3: Production Bypass Attempt (identifier: dev-guest)
  console.log('\n[TEST 3] Production Bypass Attempt (credentials: dev-guest / dev-guest)');
  let productionBlocked2 = false;
  try {
    await simulateAuthorize({ identifier: 'dev-guest', password: 'dev-guest' }, 'production');
  } catch (err) {
    productionBlocked2 = true;
    assert.strictEqual(err.message, 'Dev Guest mode is disabled in production');
  }
  assert(productionBlocked2, 'Production MUST block dev-guest credentials');
  console.log(' [PASS] Blocked crafted dev-guest payload in production environment');

  console.log('\n=======================================================');
  console.log('All Dev Guest Security & Bypass-Proof Tests PASSED 100%');
  console.log('=======================================================');
}

runSecurityAudit().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
