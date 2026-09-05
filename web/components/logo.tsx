import { Terminal } from "lucide-react";
import Link from "next/link";
import { calSans } from "@/app/fonts";

function Logo() {
  return (
    <Link
      href="/dashboard"
      className="hidden md:flex items-center gap-2.5 px-3 py-2 mb-6 group transition-all"
    >
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 flex items-center justify-center text-primary shadow-xs group-hover:border-primary/50 group-hover:scale-105 transition-all shrink-0">
        <Terminal className="w-4 h-4" />
      </div>
      <div className="hidden lg:flex items-center gap-1.5 min-w-0">
        <span className={`font-bold text-lg tracking-tight text-foreground ${calSans.className}`}>
          Nerd&apos;sHive
        </span>
        <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
          v2
        </span>
      </div>
    </Link>
  );
}

export default Logo;
