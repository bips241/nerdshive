'use client';

import { useState, useEffect } from 'react';
import { Avatar } from '@/components/ui/avatar';
import type { AvatarProps } from '@radix-ui/react-avatar';
import type { User } from 'next-auth';
import Image from 'next/image';

type Props = Partial<AvatarProps> & {
  user: (User & { user_name?: string }) | undefined | null;
  className?: string;
};

function UserAvatar({ user, className, ...avatarProps }: Props) {
  const [imgSrc, setImgSrc] = useState<string>(user?.image || '/avatar.png');

  useEffect(() => {
    setImgSrc(user?.image || '/avatar.png');
  }, [user?.image]);

  const isUnoptimized =
    typeof imgSrc === 'string' &&
    (imgSrc.startsWith('data:') || imgSrc.startsWith('blob:') || imgSrc.endsWith('.svg'));

  return (
    <Avatar className={`relative overflow-hidden rounded-full ${className || 'h-8 w-8'}`} {...avatarProps}>
      {user ? (
        <Image
          src={imgSrc}
          fill
          unoptimized={isUnoptimized}
          alt={`${user?.user_name || user?.name || 'User'}'s avatar`}
          className="rounded-full object-cover"
          sizes="64px"
          onError={() => setImgSrc('/avatar.png')}
        />
      ) : (
        <div className="rounded-full bg-muted h-full w-full" />
      )}
    </Avatar>
  );
}

export default UserAvatar;
