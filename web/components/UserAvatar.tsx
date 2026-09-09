import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { AvatarProps } from '@radix-ui/react-avatar';
import type { User } from 'next-auth';
import Image from 'next/image';

type Props = Partial<AvatarProps> & {
  user: (User & { user_name?: string }) | undefined | null;
  className?: string;
};

export default function UserAvatar({ user, className, ...avatarProps }: Props) {
  const hasImage = Boolean(user?.image);
  const imgSrc = user?.image || '/avatar.png';
  const isUnoptimized =
    typeof imgSrc === 'string' &&
    (imgSrc.startsWith('data:') || imgSrc.startsWith('blob:') || imgSrc.endsWith('.svg'));

  const initials = (user?.name || user?.user_name || 'U')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Avatar
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full aspect-square ${className || 'h-8 w-8'}`}
      {...avatarProps}
    >
      {hasImage ? (
        <Image
          src={imgSrc}
          width={64}
          height={64}
          unoptimized={isUnoptimized}
          alt={`${user?.user_name || user?.name || 'User'}'s avatar`}
          className="h-full w-full object-cover rounded-full aspect-square"
        />
      ) : (
        <AvatarFallback className="text-xs font-semibold bg-secondary text-foreground">
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
