'use client'
import { cn } from "@/lib/utils";
import type { User } from "next-auth";
import Link from "next/link";
import { redirect, usePathname } from "next/navigation";
import { buttonVariants } from "./ui/button";
import UserAvatar from "./UserAvatar";


function ProfileLink({ user }: { user?: User }) {
  const pathname = usePathname();

  //console.log(user);

  if (!user) {
    redirect('/login');
  }

  const href = `/dashboard/${user.user_name}`;
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={buttonVariants({
        variant: isActive ? "secondary" : "ghost",
        className: "navLink",
        size: "lg",
      })}
    >
      <UserAvatar
        user={user}
        className={`h-6 w-6 ${isActive && "border-2 border-white"}`}
      />
      <p
        className={`${cn("hidden lg:block", {
          "font-extrabold": isActive,
        })}`}
      >
        Profile
      </p>
    </Link>
  );
}

export default ProfileLink;
