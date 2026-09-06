import { Avatar } from '@/components/ui/avatar';
import type { AvatarProps } from '@radix-ui/react-avatar';
import type { User } from 'next-auth';
import Image from 'next/image';

type Props = Partial<AvatarProps> & {
  user: (User & { user_name?: string }) | undefined | null;
  className?: string;
};

export default function UserAvatar({ user, className, ...avatarProps }: Props) {
  const imgSrc = user?.image || '/avatar.png';
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
        />
      ) : (
        <div className="rounded-full bg-muted h-full w-full" />
      )}
    </Avatar>
  );
}
