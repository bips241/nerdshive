"use client";

import {
  Compass,
  Heart,
  Home,
  MessageSquare,
  PlusSquare,
  Search,
  Video,
} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "./ui/button";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Explore & Events", href: "/dashboard/explore", icon: Compass },
  {
    name: "Pair Radar",
    href: "/dashboard/stranger-chat",
    icon: Video,
    liveBadge: true,
  },
  {
    name: "Squad Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
  },
  {
    name: "Create",
    href: "/dashboard/create",
    icon: PlusSquare,
  },
  {
    name: "Search",
    href: "/dashboard/search",
    icon: Search,
    hideOnMobile: true,
  },
  {
    name: "Notifications",
    href: "/dashboard/notifications",
    icon: Heart,
    hideOnMobile: true,
  },
];

function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {links.map((link) => {
        const LinkIcon = link.icon;
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.name}
            href={link.href}
            prefetch={true}
            onMouseEnter={() => {
              try {
                router.prefetch(link.href);
              } catch (_) {}
            }}
            onTouchStart={() => {
              try {
                router.prefetch(link.href);
              } catch (_) {}
            }}
            className={buttonVariants({
              variant: isActive ? "secondary" : "ghost",
              className: cn("navLink justify-start gap-3", { "hidden md:flex": link.hideOnMobile }),
              size: "lg",
            })}
          >
            <div className="relative">
              <LinkIcon className="w-5 h-5 shrink-0" />
              {link.liveBadge && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <div className="hidden lg:flex items-center gap-2 min-w-0">
              <p
                className={cn("truncate text-sm", {
                  "font-extrabold text-foreground": isActive,
                })}
              >
                {link.name}
              </p>
              {link.liveBadge && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 shrink-0">
                  Live
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </>
  );
}

export default NavLinks;