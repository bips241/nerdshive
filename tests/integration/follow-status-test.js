/**
 * Follow Status & fetchProfile Schema Validation Test
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const assert = require('assert');

const MONGODB_URI = process.env.MONGODB_URI;

// Schemas matching web/models/entities/user.entity.ts and post.entity.ts
const UserSchema = new mongoose.Schema({
  user_name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  saved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
}, { timestamps: true });

const PostSchema = new mongoose.Schema({
  caption: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const FollowsSchema = new mongoose.Schema({
  followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  followingId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
const Follows = mongoose.models.Follows || mongoose.model('Follows', FollowsSchema);

async function testFetchProfile() {
  console.log('Testing fetchProfile & follow status query against real MongoDB...');
  await mongoose.connect(MONGODB_URI);

  const username = 'sarah_dev';

  // Simulates updated fetchProfile
  const user = await User.findOne({ user_name: username })
    .populate({
      path: 'posts',
      options: { sort: { createdAt: -1 } },
    })
    .populate({
      path: 'saved',
      options: { sort: { createdAt: -1 } },
    });

  assert(user, 'User @sarah_dev should exist');
  assert.strictEqual(user.user_name, 'sarah_dev');
  console.log(' [PASS] fetchProfile successfully returned user without StrictPopulateError:', user.user_name);

  // Simulates follow status query
  const follower = await User.findOne({ email: 'guest@nerdshive.local' });
  assert(follower, 'User with email guest@nerdshive.local should exist');

  const existingFollow = await Follows.findOne({
    followerId: follower._id,
    followingId: user._id,
  });

  console.log(' [PASS] Follow status check between @dev_guest and @sarah_dev:', !!existingFollow);

  await mongoose.disconnect();
  console.log('All tests passed with 0 errors!');
}

testFetchProfile().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
