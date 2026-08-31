import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { RedisEventBus, createDomainEvent, DomainEventType } from '@nerdshive/events';

const eventBus = new RedisEventBus(process.env.REDIS_URL);

export async function POST(request: Request) {
  await connectDB();

  try {
    const { username, code } = await request.json();

    const decodedUsername = decodeURIComponent(username);
    const user = await User.findOne({ user_name: decodedUsername });

    if (!user) {
      return Response.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const isCodeValid = user.verifyCode === code;
    const isCodeNotExpired = new Date(user.verifyCodeExpiry) > new Date();

    if (isCodeValid && isCodeNotExpired) {
      user.isVerified = true;
      await user.save();

      try {
        await eventBus.publish(
          createDomainEvent(DomainEventType.USER_VERIFIED, 'auth-proxy', {
            userId: user._id.toString(),
            username: user.user_name,
            email: user.email,
          })
        );
      } catch (err) {
        console.warn('Failed to publish user.verified event:', err);
      }

      return Response.json(
        { success: true, message: 'Account verified successfully' },
        { status: 200 }
      );
    } else if (!isCodeNotExpired) {
      return Response.json(
        {
          success: false,
          message: 'Verification code has expired. Please sign up again to get a new code.',
        },
        { status: 400 }
      );
    } else {
      return Response.json(
        { success: false, message: 'Incorrect verification code' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error verifying user:', error);
    return Response.json(
      { success: false, message: 'Error verifying user' },
      { status: 500 }
    );
  }
}