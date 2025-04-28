import { NextRequest, NextResponse } from 'next/server';




export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/', '/verify/:path*','/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

export default async function middleware(request: NextRequest) {
  const currentUser = await request.cookies.get('__Secure-authjs.session-token')?.value;
    
  console.log('currentUser', currentUser);
    const url = request.nextUrl;

    //(`currentUser`, currentUser);
  

  
  if (
    currentUser &&
    (url.pathname.startsWith('/login') ||
      url.pathname.startsWith('/register') ||
      url.pathname.startsWith('/verify') ||
      url.pathname === '/')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!currentUser && url.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}