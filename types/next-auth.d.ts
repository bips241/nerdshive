import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      _id?: string;
      isVerified?: boolean;
      user_name?: string;
      image:string;
    } ;
  }

  interface User {
    _id?: string;
    isVerified?: boolean;
    user_name?: string;
    image:string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    _id?: string;
    isVerified?: boolean;
    user_name?: string;
    image:string;
  }
}