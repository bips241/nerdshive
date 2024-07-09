import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import connectDB from "./lib/db";
import { User } from "./models/User";
import { compare } from "bcryptjs";

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
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) {
          throw new Error("Please provide all credentials");
        }

        await connectDB(); 

        const user = await User.findOne({ email });

        if (!user) {
          throw new Error("User not found, check your credentials");
        }

        if (!user.password) {
          throw new Error("Invalid email or password");
        }


        const isMatched = await compare(password, user.password);

        if (!isMatched) {
          throw new Error("Password did not match");
        }

        
        const userData = {
          _id: user._id.toString(),
          user_name: user.user_name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        };

        return userData;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token._id = user._id;
        token.isVerified = user.isVerified;
        token.user_name = user.user_name;
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
      if (account?.provider === "google" || account?.provider === "github") {
        try {
          const { email, user_name, image, id } = user;
          await connectDB();
          const alreadyUser = await User.findOne({ email });

          if (!alreadyUser) {
            await User.create({ email, user_name, image, authProviderId: id });
          }
          return true;
        } catch (error) {
          throw new Error("Error while creating user");
        }
      }

      if (account?.provider === "credentials") {
        return true;
      } else {
        return false;
      }
    },
  },
});
