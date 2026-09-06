import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import connectDB from './lib/db';
import { User } from './models/User';
import {compare} from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email/Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        isDevGuest: { label: 'Dev Guest Flag', type: 'text' },
      },
      async authorize(credentials: any): Promise<any> {
        const { identifier, password, isDevGuest } = credentials || {};

        // STRICT PRODUCTION GUARD: Dev Guest Mode is strictly forbidden in production.
        const isDevEnvironment = process.env.NODE_ENV !== 'production';
        const isGuestRequest =
          isDevGuest === true ||
          isDevGuest === 'true' ||
          (identifier === 'dev-guest' && password === 'dev-guest');

        if (isGuestRequest) {
          if (!isDevEnvironment) {
            // Absolute bypass prevention: In production, hard fail immediately.
            throw new Error('Dev Guest mode is disabled in production');
          }

          await connectDB();
          let guestUser = await User.findOne({
            $or: [
              { user_name: 'dev_guest' },
              { email: 'guest@nerdshive.local' },
              { email: 'devguest@nerdshive.local' },
            ],
          });

          if (!guestUser) {
            guestUser = await User.create({
              user_name: 'dev_guest',
              email: 'guest@nerdshive.local',
              name: 'Dev Guest',
              bio: '🚀 Senior Fullstack Engineer | TypeScript, Next.js 14, NestJS, WebRTC & Rust | Building high-scale developer tools.',
              isVerified: true,
              image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
              role: 'developer',
              website: 'https://nerdshive.online',
              repo: 'https://github.com/nerdshive/nerdshive',
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

        await connectDB();

        try {
          const user = await User.findOne({
            $or: [{ email: identifier }, { user_name: identifier }],
          }).select("+password");

          if (!user) {
            throw new Error("Invalid email or password");
          }

          if (!user.isVerified) {
            throw new Error('Please verify your account before logging in');
          }
  
          if (!user.password) {
            throw new Error("Invalid email or password");
          }
  
          const isMatched = await compare(password, user.password);
  
          if (!isMatched) {
            throw new Error("Password did not matched");
          }

          if (isMatched) {
            const userData = {
              _id: user._id.toString(),
              user_name: user.user_name,
              email: user.email,
              role: user.role,
              isVerified: user.isVerified,
              image:user.image
            };

            return userData;
          } else {
            throw new Error('Incorrect password');
          }
        } catch (error :any) {
          console.error('Authorize error:', error);
          throw new Error(error);
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token._id = (user as any)._id || user.id; 
        token.isVerified = (user as any).isVerified ?? true;
        token.user_name = (user as any).user_name;
        token.email = user.email;
        token.image = user.image;
        token.role = (user as any).role || 'developer';
      }

      if (trigger === 'update' && session?.user_name) {
        token.user_name = session.user_name;
      }

      // Sync active username, role and user details from DB to keep session always in sync
      if (token._id) {
        try {
          await connectDB();
          const dbUser = await User.findById(token._id).select('user_name image isVerified email role name').lean();
          if (dbUser) {
            token.user_name = dbUser.user_name;
            token.role = (dbUser as any).role || 'developer';
            if (dbUser.image) token.image = dbUser.image;
            if (dbUser.isVerified !== undefined) token.isVerified = dbUser.isVerified;
            if ((dbUser as any).name) token.name = (dbUser as any).name;
          }
        } catch (e) {
          // Fail gracefully if DB query times out
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user._id = token._id as string; 
        session.user.user_name = token.user_name as string;
        session.user.isVerified = token.isVerified as boolean;
        session.user.image = token.image as string;
        session.user.role = (token.role as string) || 'developer';
        if (token.name) session.user.name = token.name as string;
        if (token.email) session.user.email = token.email as string;
      }
      return session;
    },
    
    signIn: async ({ user, account }) => {
      if (account?.provider === 'google' || account?.provider === 'github') {
        try {
          const email = user.email;
          if (!email) return false;

          await connectDB();
          let dbUser = await User.findOne({ email });

          if (!dbUser) {
            const rawBase = (user.name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9_]/g, '_');
            let generatedUsername = rawBase.slice(0, 20);
            let counter = 1;
            while (await User.findOne({ user_name: generatedUsername })) {
              generatedUsername = `${rawBase.slice(0, 15)}_${counter}`;
              counter++;
            }

            dbUser = await User.create({
              email,
              user_name: generatedUsername,
              name: user.name || generatedUsername,
              image: user.image,
              isVerified: true,
              authProviderId: user.id,
            });
          }

          (user as any)._id = dbUser._id.toString();
          (user as any).user_name = dbUser.user_name;
          (user as any).isVerified = dbUser.isVerified;
          return true;
        } catch (error) {
          console.error('Error in OAuth sign in:', error);
          return false;
        }
      }

      if (account?.provider === 'credentials') {
        return true;
      } else {
        return false;
      }
    },
  },
});


