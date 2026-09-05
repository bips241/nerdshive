'use client';

import { cn } from "@/lib/utils";
import type { User } from "next-auth";
import Link from "next/link";
import { redirect, usePathname } from "next/navigation";
import UserAvatar from "./UserAvatar";

function ProfileLink({ user }: { user?: User }) {
  const pathname = usePathname();

  if (!user) {
    redirect('/login');
  }

  const href = user?.user_name ? `/dashboard/user/${user.user_name}` : '/dashboard';
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group shrink-0",
        isActive
          ? "bg-secondary text-foreground font-semibold shadow-xs"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
      )}
    >
      <UserAvatar
        user={user}
        className={`h-5 w-5 ${isActive && "ring-1 ring-primary"}`}
      />
      <span
        className={cn("hidden lg:block truncate", {
          "text-foreground font-semibold": isActive,
        })}
      >
        Profile
      </span>
    </Link>
  );
}

export default ProfileLink;
