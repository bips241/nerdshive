export const dynamic = 'force-dynamic';

import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { z } from 'zod';
import { u_nameValid } from '@/schemas/signUpSchema';

const UsernameQuerySchema = z.object({
  username: u_nameValid,
});

export async function GET(request: Request) {
  await connectDB(); // Assuming connectDB() connects to your database

  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      username: searchParams.get('username'),
    };

    const result = UsernameQuerySchema.safeParse(queryParams);

    if (!result.success) {
      const usernameErrors = result.error.format().username?._errors || [];
      return Response.json(
        {
          success: false,
          message:
            usernameErrors.length > 0
              ? usernameErrors.join(', ')
              : 'Invalid query parameters',
        },
        { status: 400 }
      );
    }

    const { username } = result.data;

    console.log(`Checking username: ${username}`);

    const existingVerifiedUser = await User.findOne({
      user_name: username,
      isVerified: true,
    });

    console.log('Existing verified user:', existingVerifiedUser);

    if (existingVerifiedUser) {
      return Response.json(
        {
          success: false,
          message: 'Username is already taken',
        },
        { status: 200 }
      );
    }

    return Response.json(
      {
        success: true,
        message: 'Username is unique',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking username:', error);
    return Response.json(
      {
        success: false,
        message: 'Error checking username',
      },
      { status: 500 }
    );
  }
}
