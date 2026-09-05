require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { performance } = require('perf_hooks');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in environment or .env');
  process.exit(1);
}

async function testOptimizedQuery() {
  await mongoose.connect(MONGODB_URI, { maxPoolSize: 10 });

  const UserSchema = new mongoose.Schema({ user_name: String, image: String, name: String });
  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  const CommentSchema = new mongoose.Schema({ body: String, userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } });
  const Comment = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);

  const LikeSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } });
  const Like = mongoose.models.Like || mongoose.model('Like', LikeSchema);

  const PostSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Like' }],
    createdAt: Date,
  }, { strict: false });
  const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

  console.log('Testing Optimized Lean Query with Bounded Populates...');
  const t0 = performance.now();
  const posts = await Post.find({})
    .select('-__v')
    .populate({
      path: 'userId',
      select: 'user_name image name email',
    })
    .populate({
      path: 'likes',
      select: 'userId',
    })
    .populate({
      path: 'comments',
      options: { limit: 3, sort: { createdAt: -1 } },
      populate: {
        path: 'userId',
        select: 'user_name image',
      },
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const duration = (performance.now() - t0).toFixed(2);
  console.log(`[OPTIMIZED QUERY] Fetched and populated ${posts.length} posts in ${duration}ms!`);

  await mongoose.disconnect();
}

testOptimizedQuery().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
