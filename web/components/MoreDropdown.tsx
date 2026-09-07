"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Activity,
  Bookmark,
  BookOpen,
  ChevronLeft,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
} from "lucide-react";

import { useTheme } from "next-themes";
import * as React from "react";
const { useEffect, useRef, useState } = React;
import Link from "next/link";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { signOut } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";

function MoreDropdown() {
  const [showModeToggle, setShowModeToggle] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut()
      .then(result => {
        console.log(result);
        toast({
          title: 'logged out successfully'
        });
      })
      .catch(error => {
        console.error(error);
        toast({
          title: 'Error',
          description: 'something went wrong try again' ,
          variant: 'destructive'
        });
      });
  };

  useEffect(() => {
    
    function handleOutsideClick(event: MouseEvent) {
      if (!event.target) return;
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowModeToggle(false);
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [ref]);

  return (
    <DropdownMenu open={open}>
      <DropdownMenuTrigger asChild>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group w-full text-muted-foreground hover:text-foreground hover:bg-secondary/40 text-left outline-none"
        >
          <Menu className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
          <span className="hidden lg:block">More</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        ref={ref}
        className={cn(
          "dark:bg-neutral-800 w-64 !rounded-xl !p-0 transition-opacity",
          !open && "opacity-0"
        )}
        align="end"
        alignOffset={-40}
      >
        {!showModeToggle && (
          <>
            <Link href="/dashboard/settings" onClick={() => setOpen(false)}>
              <DropdownMenuItem className="menuItem cursor-pointer">
                <Settings size={20} />
                <p>Settings</p>
              </DropdownMenuItem>
            </Link>

            <Link href="/dashboard/activity" onClick={() => setOpen(false)}>
              <DropdownMenuItem className="menuItem cursor-pointer">
                <Activity size={20} />
                <p>Your activity</p>
              </DropdownMenuItem>
            </Link>

            <Link href="/dashboard/saved" onClick={() => setOpen(false)}>
              <DropdownMenuItem className="menuItem cursor-pointer">
                <Bookmark size={20} />
                <p>Saved</p>
              </DropdownMenuItem>
            </Link>

            <Link href="/devs/docs" onClick={() => setOpen(false)}>
              <DropdownMenuItem className="menuItem cursor-pointer text-cyan-400 font-medium flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <BookOpen size={20} />
                  <p>Developer Specs</p>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Secured
                </span>
              </DropdownMenuItem>
            </Link>

            <DropdownMenuItem
              className="menuItem"
              onClick={() => setShowModeToggle(true)}
            >
              <Moon size={20} />
              <p>Switch appearance</p>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="menuItem"
              onClick={(e) => {
                e.preventDefault();
                handleSignOut();
              }}
            >
              <LogOut size={20} />
              <p>Log out</p>
            </DropdownMenuItem>
          </>
        )}

        {showModeToggle && (
          <>
            <div className="flex items-center border-b border-gray-200 dark:border-neutral-700 py-3.5 px-2.5">
              <ChevronLeft size={18} onClick={() => setShowModeToggle(false)} />
              <p className="font-bold ml-1">Switch appearance</p>
              {theme === "dark" ? (
                <Moon size={20} className="ml-auto" />
              ) : (
                <Sun size={20} className="ml-auto" />
              )}
            </div>

            <Label htmlFor="dark-mode" className="menuItem">
              Dark Mode
              <DropdownMenuItem className="ml-auto !p-0">
                <Switch
                  id="dark-mode"
                  className="ml-auto"
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => {
                    setTheme(checked ? "dark" : "light");
                  }}
                />
              </DropdownMenuItem>
            </Label>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default MoreDropdown;
