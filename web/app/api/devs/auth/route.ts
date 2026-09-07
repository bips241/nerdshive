import { NextRequest, NextResponse } from 'next/server';
import { 
  verifyDevPassword, 
  createDevSessionToken, 
  DEV_SESSION_COOKIE 
} from '@/app/devs/lib/auth';

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    const isValid = verifyDevPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid developer access password' },
        { status: 401 }
      );
    }

    const token = createDevSessionToken();
    const response = NextResponse.json({ success: true, message: 'Developer session granted' });

    response.cookies.set({
      name: DEV_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Internal verification error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Developer session terminated' });
  response.cookies.set({
    name: DEV_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
