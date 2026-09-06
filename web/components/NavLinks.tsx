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
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Explore & Events", href: "/dashboard/explore", icon: Compass },
  {
    name: "Pair Radar",
    href: "/dashboard/radar",
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
    <div className="flex flex-row md:flex-col gap-1 w-full">
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
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group shrink-0",
              link.hideOnMobile ? "hidden md:flex" : "flex",
              isActive
                ? "bg-secondary text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
            )}
          >
            <div className="relative">
              <LinkIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
              {link.liveBadge && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <div className="hidden lg:flex items-center gap-2 min-w-0">
              <span
                className={cn("truncate", {
                  "text-foreground font-semibold": isActive,
                })}
              >
                {link.name}
              </span>
              {link.liveBadge && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 shrink-0">
                  Live
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default NavLinks;