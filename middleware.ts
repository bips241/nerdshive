import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';


export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/', '/verify/:path*'],
};

export default async function middleware(request: NextRequest) {
    const session = await auth();
    const user = session?.user;
  
    const url = request.nextUrl;

    console.log(`user`, user);
  

  
  if (
    user &&
    (url.pathname.startsWith('/login') ||
      url.pathname.startsWith('/register') ||
      url.pathname.startsWith('/verify') ||
      url.pathname === '/')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!user && url.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}