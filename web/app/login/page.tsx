'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { signIn } from 'next-auth/react';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { signInSchema } from '@/schemas/signInSchema';
import { IconBrandGoogleFilled, IconBrandGithubFilled } from '@tabler/icons-react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function SignInForm() {
  const router = useRouter();
  const[isSubmitting,setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const { toast } = useToast();

  const onSubmit = async (data: z.infer<typeof signInSchema>) => {
    setIsSubmitting(true);
    const result = await signIn('credentials', {
      redirect: false,
      identifier: data.identifier,
      password: data.password,
    });
    
    if (result?.error) {
      setIsSubmitting(false);
      console.log(result.error);
      if (result.error === 'CredentialsSignin') {
        toast({
          title: 'Login Failed',
          description: 'Incorrect username or password',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: "check credentials and try again",
          variant: 'destructive',
        });
      }
    }

    if (result?.url) {
      setIsSubmitting(false);
      router.replace('/dashboard');
    }
  };

  const handleSocialSignIn = async (provider: string) => {
    const result = await signIn(provider, { callbackUrl: '/dashboard', redirect: false });

    if (result?.error) {
      toast({
        title: 'Error',
        description: `Sign in with ${provider} failed.`,
        variant: 'destructive',
      });
    }

    if (result?.url) {
      router.replace(result.url);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-inherit">
      <div className="w-full max-w-md p-8 space-y-8 bg-inherit rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6">
            Nerd'sHive
          </h1>
          <p className="mb-4">social media platform dedicated to devs</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              name="identifier"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email/Username</FormLabel>
                  <Input {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="password"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <Input type="password" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting?(
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    logging in
                </>
              )
              :('Sign In')}
            </Button>
          </form>
          <div className="flex justify-center space-x-4 mt-4">
            <Button className="rounded-full" onClick={(e) => { e.preventDefault(); handleSocialSignIn('google'); }}>
              <IconBrandGoogleFilled />
            </Button>
            <Button className="rounded-full" onClick={(e) => { e.preventDefault(); handleSocialSignIn('github'); }}>
              <IconBrandGithubFilled />
            </Button>
          </div>
        </Form>
        <div className="text-center mt-4">
          <p>
            Not a member yet?{' '}
            <Link href="/register" className="text-blue-600 hover:text-blue-800">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
