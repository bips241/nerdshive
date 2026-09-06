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
      <div className="hidden lg:flex items-center justify-between gap-2 min-w-0 flex-1">
        <span
          className={cn("truncate", {
            "text-foreground font-semibold": isActive,
          })}
        >
          Profile
        </span>
        {user?.role && user.role !== 'developer' && user.role !== 'user' && (
          <span
            className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider",
              user.role === 'admin' && "bg-red-500/10 text-red-400 border-red-500/30",
              user.role === 'organizer' && "bg-purple-500/10 text-purple-400 border-purple-500/30",
              user.role === 'judge' && "bg-amber-500/10 text-amber-400 border-amber-500/30"
            )}
          >
            {user.role}
          </span>
        )}
      </div>
    </Link>
  );
}

export default ProfileLink;
