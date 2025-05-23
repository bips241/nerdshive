import mongoose from 'mongoose';
const { Schema } = mongoose;

// User schema
const userSchema = new mongoose.Schema({
  user_name: {  
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    unique: true,
  },
  email: { 
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [/.+\@.+\..+/, 'Please use a valid email address'],
  },
  bio: {
    type: String,
    maxlength: 150,
    required: false
  },
  gender: { 
    type: String, 
    enum: ['male', 'female', 'other'],
    required: false 
  },
  website: {
    type: String,
    required: false
  },
  repo: {
    type: String,
    required: false
  },
  password: { 
    type: String,
    required: [true, 'Password is required'],
  },
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
  saved: [{ type: Schema.Types.ObjectId, ref: 'SavedPost' }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'Like' }],
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
  followedBy: [{ type: Schema.Types.ObjectId, ref: 'Follows' }],
  following: [{ type: Schema.Types.ObjectId, ref: 'Follows' }],
  accounts: [{ type: Schema.Types.ObjectId, ref: 'Account' }],
  sessions: [{ type: Schema.Types.ObjectId, ref: 'Session' }],
  verifyCode: {
    type: String,
    required: [true, 'Verify Code is required'],
  },
  verifyCodeExpiry: {
    type: Date,
    required: [true, 'Verify Code Expiry is required'],
  },
  role: { 
    type: String, 
    default: "user" 
  },
  image: {
    type: String,
    required: false
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  authProviderId: { 
    type: String,
    required: false
  }
}, {
  timestamps: true,
  collection: 'users'
});

export const User = mongoose.models?.User || mongoose.model('User', userSchema);

// VerificationToken schema
const VerificationTokenSchema = new Schema({
  identifier: { type: String, required: true },
  token: { type: String, unique: true, required: true },
  expires: { type: Date, required: true }
});
VerificationTokenSchema.index({ identifier: 1, token: 1 }, { unique: true });

// Account schema
const AccountSchema = new Schema({
  userId: { type: String, required: true, ref: 'User' },
  type: { type: String, required: true },
  provider: { type: String, required: true },
  providerAccountId: { type: String, required: true },
  refresh_token: { type: String, default: null },
  access_token: { type: String, default: null },
  expires_at: { type: Number, default: null },
  token_type: { type: String, default: null },
  scope: { type: String, default: null },
  id_token: { type: String, default: null },
  session_state: { type: String, default: null },
  oauth_token_secret: { type: String, default: null },
  oauth_token: { type: String, default: null }
});
AccountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });
AccountSchema.index({ userId: 1 });

// Follows schema
const FollowsSchema = new Schema({
  followerId: { type: String, required: true, ref: 'User' },
  followingId: { type: String, required: true, ref: 'User' }
});
FollowsSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

//chatroom schema

const ChatRoomSchema = new Schema({
  participants: [
    { type: Schema.Types.ObjectId, ref: 'User', required: true }
  ],
  lastMessage: {
    type: String,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });


// Message schema
const MessageSchema = new Schema({
  roomId: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });


// Post schema
const PostSchema = new Schema({
  postType: {
    type: String,
    enum: ['media', 'poll', 'goal', 'project'],
    default: 'media'
  },
  project: {
    title: { type: String },
    description: { type: String },
    techStack: [{ type: String }],    // ["Next.js", "Node.js", "MongoDB"]
    repoUrl: { type: String },         // optional GitHub link
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    lookingFor: [{ type: String,required: false}],    // ["Frontend Developer", "UI Designer"]
  },
  caption: { type: String, default: null },
  fileUrl: { type: String }, // Only for media posts (optional for poll/goal)
  
  likes: [{ type: Schema.Types.ObjectId, ref: 'Like' }],
  savedBy: [{ type: Schema.Types.ObjectId, ref: 'SavedPost' }],
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
  userId: { type: String, required: true, ref: 'User' },
  
  // For Polls
  poll: {
    question: { type: String },
    options: [
      {
        text: { type: String },
        votes: [{ type: Schema.Types.ObjectId, ref: 'User' }]
      }
    ],
  },

  // For Goals
  goal: {
    description: { type: String },
    goalTargetDate: { type: Date },
    interestedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },

}, {
  timestamps: true
});

PostSchema.index({ userId: 1 });

// ProjectRequest schema

const ProjectRequestSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, {
  timestamps: true
});

// poll vote result schema

const PollVoteSchema = new mongoose.Schema({
  pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true }, // assuming polls are posts
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  selectedOptionIndex: { type: Number, required: true }, // which option they chose (0,1,2,etc)
}, { timestamps: true });


// SavedPost schema
const SavedPostSchema = new Schema({
  postId: { type: String, required: true, ref: 'Post' },
  userId: { type: String, required: true, ref: 'User' }
}, {
  timestamps: true
});
SavedPostSchema.index({ postId: 1, userId: 1 }, { unique: true });
SavedPostSchema.index({ userId: 1 });

// Like schema
const LikeSchema = new Schema({
  postId: { type: String, required: true, ref: 'Post' },
  userId: { type: String, required: true, ref: 'User' }
}, {
  timestamps: true
});
LikeSchema.index({ postId: 1, userId: 1 }, { unique: true });
LikeSchema.index({ userId: 1 });

// Comment schema
const CommentSchema = new Schema({
  body: { type: String, required: true },
  postId: { type: String, required: true, ref: 'Post' },
  userId: { type: String, required: true, ref: 'User' }
}, {
  timestamps: true
});
CommentSchema.index({ postId: 1 });
CommentSchema.index({ userId: 1 });


export const VerificationToken = mongoose.models?.VerificationToken || mongoose.model('VerificationToken', VerificationTokenSchema);
export const Account = mongoose.models?.Account || mongoose.model('Account', AccountSchema);
export const Follows = mongoose.models?.Follows || mongoose.model('Follows', FollowsSchema);
export const Post = mongoose.models?.Post || mongoose.model('Post', PostSchema);
export const SavedPost = mongoose.models?.SavedPost || mongoose.model('SavedPost', SavedPostSchema);
export const Like = mongoose.models?.Like || mongoose.model('Like', LikeSchema);
export const Comment = mongoose.models?.Comment || mongoose.model('Comment', CommentSchema);
export const ProjectRequest = mongoose.models?.ProjectRequest || mongoose.model("ProjectRequest", ProjectRequestSchema);
export const PollVote = mongoose.models?.PollVote || mongoose.model('PollVote', PollVoteSchema);
export const ChatRoom = mongoose.models?.ChatRoom || mongoose.model('ChatRoom', ChatRoomSchema);
export const Message = mongoose.models?.Message || mongoose.model('Message', MessageSchema);