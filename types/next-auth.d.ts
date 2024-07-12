// types/next-auth.d.ts
import { DefaultUser } from 'next-auth';

declare module 'next-auth' {
  interface User extends DefaultUser {
    _id: string;
    user_name?: string;
    isVerified: boolean;
  }

  interface Session {
    user: {
      _id?: string;
      isVerified?: boolean;
      user_name?: string;
    } & DefaultSession['user'];
  }

}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    isVerified: boolean;
    user_name: string;
  }
}
