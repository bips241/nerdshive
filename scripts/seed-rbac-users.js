/**
 * Seed Distinct RBAC Persona Test Accounts for Nerd'sHive
 * Provisions Admin, Organizer, Judge, Squad Lead, and Member accounts with full password hashes.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../web/.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

async function seedRbacUsers() {
  console.log('Connecting to MongoDB Atlas cluster...');
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log(' Connected to MongoDB!');

  const hashedPassword = await bcrypt.hash('dev-guest', 10);

  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    password: String,
    user_name: { type: String, unique: true, required: true },
    bio: String,
    role: { type: String, default: 'developer' },
    isVerified: { type: Boolean, default: true },
    image: String,
  }, { timestamps: true }));

  const HackathonEvent = mongoose.models.HackathonEvent || mongoose.model('HackathonEvent', new mongoose.Schema({
    name: String,
    slug: { type: String, unique: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    judges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }, { strict: false }));

  const accounts = [
    {
      user_name: 'admin_nerdshive',
      email: 'admin@nerdshive.local',
      name: 'Alexei Vance (Superadmin)',
      password: hashedPassword,
      bio: '🛡️ Platform Operator & System Administrator | Global Moderation & Verified Issuance.',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      role: 'admin',
      isVerified: true,
    },
    {
      user_name: 'mit_organizer',
      email: 'organizer@nerdshive.local',
      name: 'MIT Tech Board (Organizer)',
      password: hashedPassword,
      bio: '🏆 Official Host & Director at HackMIT | Managing rounds, rubrics, tracks & prize pools.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      role: 'organizer',
      isVerified: true,
    },
    {
      user_name: 'prof_judge',
      email: 'judge@nerdshive.local',
      name: 'Dr. Evelyn Reed (Lead Judge)',
      password: hashedPassword,
      bio: '⚖️ AI Systems Evaluator & Faculty Mentor | Scoring architectures, code quality & UX rubrics.',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      role: 'judge',
      isVerified: true,
    },
    {
      user_name: 'dev_guest',
      email: 'guest@nerdshive.local',
      name: 'Dev Guest (Squad Lead)',
      password: hashedPassword,
      bio: '🚀 Senior Fullstack Engineer | TypeScript, Next.js 14, WebRTC & Rust | Building high-scale developer tools.',
      image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      role: 'developer',
      isVerified: true,
    },
    {
      user_name: 'sarah_dev',
      email: 'sarah@nerdshive.local',
      name: 'Sarah Chen (Participant)',
      password: hashedPassword,
      bio: '⚛️ Frontend Architect & UI/UX Specialist | Competing in HackMIT Web3 & AI Track.',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      role: 'developer',
      isVerified: true,
    },
  ];

  console.log('\n--- Upserting RBAC Persona Accounts ---');
  const userMap = new Map();

  for (const acc of accounts) {
    let user = await User.findOne({
      $or: [{ email: acc.email }, { user_name: acc.user_name }],
    });
    if (!user) {
      user = await User.create(acc);
      console.log(`[+] Created ${acc.role.toUpperCase()} Account: @${user.user_name} (${user.email})`);
    } else {
      user.user_name = acc.user_name;
      user.email = acc.email;
      user.name = acc.name;
      user.bio = acc.bio;
      user.image = acc.image;
      user.role = acc.role;
      user.password = hashedPassword;
      user.isVerified = true;
      await user.save();
      console.log(`[✓] Updated ${acc.role.toUpperCase()} Account: @${user.user_name} (${user.email})`);
    }
    userMap.set(acc.role, user);
  }

  // Link HackMIT 2026 to Organizer and Judge
  const mitOrganizer = userMap.get('organizer');
  const leadJudge = userMap.get('judge');

  if (mitOrganizer && leadJudge) {
    let hackmit = await HackathonEvent.findOne({ slug: 'hackmit-2026' });
    if (hackmit) {
      hackmit.organizerId = mitOrganizer._id;
      hackmit.judges = [leadJudge._id];
      await hackmit.save();
      console.log(`\n[✓] Configured HackMIT 2026: Organizer = @${mitOrganizer.user_name}, Assigned Judge = @${leadJudge.user_name}`);
    }
  }

  console.log('\n=============================================================');
  console.log('✅ RBAC PERSONA ACCOUNTS SEEDED SUCCESSFULLY');
  console.log('=============================================================');
  console.log('Universal Password for all accounts: "dev-guest"\n');
  accounts.forEach((a) => {
    console.log(`- ${a.role.toUpperCase().padEnd(10)}: Email: ${a.email.padEnd(25)} Username: @${a.user_name}`);
  });
  console.log('=============================================================\n');

  await mongoose.disconnect();
}

seedRbacUsers().catch((err) => {
  console.error('Error seeding RBAC users:', err);
  process.exit(1);
});
