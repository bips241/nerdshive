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
      },
      async authorize(credentials: any): Promise<any> {
        const { identifier, password } = credentials;

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
            };

            return userData;
          } else {
            throw new Error('Incorrect password');
          }
        } catch (error :any) {
          console.error('Authorize error:', error);
          throw new Error(error.message || 'Login failed');
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token._id = user._id;
        token.isVerified = user.isVerified;
        token.user_name = <string><unknown>user.user_name?.toString;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.sub && typeof token.isVerified === 'boolean') {
        session.user.id = token.sub;
        session.user.user_name = token.user_name as string;
        session.user.isVerified = token.isVerified;
      }
      return session;
    },
    signIn: async ({ user, account }) => {
      if (account?.provider === 'google' || account?.provider === 'github') {
        try {
          const { email, user_name, image, id } = user;
          await connectDB();
          const alreadyUser = await User.findOne({ email });

          if (!alreadyUser) {
            await User.create({ email, user_name, image, authProviderId: id });
          }
          return true;
        } catch (error) {
          throw new Error('Error while creating user');
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
