import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  user_name:{  
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    unique: true,
  },
  email: { type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [/.+\@.+\..+/, 'Please use a valid email address'],
  },
  password: { type: String,
    required: [true, 'Password is required'],
  },
  verifyCode: {
    type: String,
    required: [true, 'Verify Code is required'],
  },
  verifyCodeExpiry: {
    type: Date,
    required: [true, 'Verify Code Expiry is required'],
  },
  role: { type: String, default: "user" },
  image: { type: String },
  isVerified:{ type: Boolean, default: false},
  authProviderId: { type: String },
});

export const User = mongoose.models?.User || mongoose.model("User", userSchema);