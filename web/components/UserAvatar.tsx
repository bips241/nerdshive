'use client'
import { Avatar } from "@/components/ui/avatar";
import type { AvatarProps } from "@radix-ui/react-avatar";
import { Link } from "lucide-react";
import type { User } from "next-auth";
import Image from "next/image";

type Props = Partial<AvatarProps> & {
  user: User | undefined;
};

function UserAvatar({ user, ...avatarProps }: Props) {
  
  const imageUrl = user?.image || '/avatar.png';

  return (
    <Avatar className="relative h-8 w-8" {...avatarProps}>
      {user ? (
        <Image
          src={imageUrl}
          fill
          alt={`${user?.user_name}'s profile picture`}
          className="rounded-full object-cover"
        />
      ) : (
        <div className="rounded-full bg-gray-200 h-full w-full"></div>
      )}
      <Link
        href="/dashboard/${user?.user_name}"
      />
    </Avatar>
  );
}

export default UserAvatar;
