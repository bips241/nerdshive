import { NextRequest, NextResponse } from 'next/server';




export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/', '/verify/:path*','/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

export default async function middleware(request: NextRequest) {
  const currentUser =
    request.cookies.get('authjs.session-token')?.value ||
    request.cookies.get('__Secure-authjs.session-token')?.value ||
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;
  
  const url = request.nextUrl;
  

  
  if (
    currentUser &&
    (url.pathname.startsWith('/login') ||
      url.pathname.startsWith('/register') ||
      url.pathname.startsWith('/verify') ||
      url.pathname === '/')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const isPublicDashboardRoute =
    (url.pathname.startsWith('/dashboard/p/') && !url.pathname.includes('/edit')) ||
    url.pathname.startsWith('/dashboard/user/') ||
    url.pathname === '/dashboard/explore';

  if (!currentUser && url.pathname.startsWith('/dashboard') && !isPublicDashboardRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}