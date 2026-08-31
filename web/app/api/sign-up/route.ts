import connectDB from '@/lib/db';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/helpers/sendVerificationEmail';
import { RedisEventBus, createDomainEvent, DomainEventType } from '@nerdshive/events';

const eventBus = new RedisEventBus(process.env.REDIS_URL);

export async function POST(request: Request) {
  await connectDB();

  try {
    const { user_name, email, password } = await request.json();

    // Ensure all required fields are present
    if (!user_name || !email || !password) {
      return Response.json(
        {
          success: false,
          message: 'All fields are required',
        },
        { status: 400 }
      );
    }

    const existingVerifiedUserByUsername = await User.findOne({
      user_name,
      isVerified: true,
    });

    if (existingVerifiedUserByUsername) {
      return Response.json(
        {
          success: false,
          message: 'Username is already taken',
        },
        { status: 400 }
      );
    }

    const existingUserByEmail = await User.findOne({ email });
    const verifyCode = crypto.randomInt(100000, 999999).toString();
    const verifyCodeExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    let userId: string;

    if (existingUserByEmail) {
      if (existingUserByEmail.isVerified) {
        return Response.json(
          {
            success: false,
            message: 'User already exists with this email',
          },
          { status: 400 }
        );
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        existingUserByEmail.password = hashedPassword;
        existingUserByEmail.verifyCode = verifyCode;
        existingUserByEmail.verifyCodeExpiry = verifyCodeExpiry;
        await existingUserByEmail.save();
        userId = existingUserByEmail._id.toString();
      }
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        user_name,
        email,
        password: hashedPassword,
        verifyCode,
        verifyCodeExpiry,
        isVerified: false,
      });

      await newUser.save();
      userId = newUser._id.toString();
    }

    // Publish User Registered Domain Event
    try {
      await eventBus.publish(
        createDomainEvent(DomainEventType.USER_REGISTERED, 'auth-proxy', {
          userId,
          username: user_name,
          email,
        })
      );
    } catch (err) {
      console.warn('Failed to publish user.registered domain event:', err);
    }

    // Send verification email
    const emailResponse = await sendVerificationEmail(
      email,
      user_name,
      verifyCode
    );

    if (!emailResponse.success) {
      return Response.json(
        {
          success: false,
          message: emailResponse.message,
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        message: 'User registered successfully. Please verify your account.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering user:', error);
    return Response.json(
      {
        success: false,
        message: 'Error registering user',
      },
      { status: 500 }
    );
  }
}
