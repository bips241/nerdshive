import {z} from "zod";

export const u_nameValid = z
.string()
.min(2, 'Username must be at least 2 characters')
.max(8, 'Username must be no more than 8 characters')
.regex(/^[a-zA-Z0-9_]+$/, 'Username must not contain special characters');

export const signUpSchema = z.object({
    user_name: u_nameValid,

    email: z.string().email({ message: 'Invalid email address' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters' }),
  });