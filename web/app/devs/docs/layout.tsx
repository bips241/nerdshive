import React from 'react';
import Link from 'next/link';
import { BookOpen, ArrowLeft, Terminal, ShieldCheck, Sparkles, ExternalLink, Shield } from 'lucide-react';
import { getDevSessionStatus } from '@/app/devs/lib/auth';
import DevLockScreen from './components/DevLockScreen';
import LockPortalButton from './components/LockPortalButton';

export default async function DevsDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = await getDevSessionStatus();

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/devs/docs"
              className="flex items-center gap-2.5 font-bold tracking-tight text-white hover:text-cyan-400 transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-extrabold leading-tight tracking-tight text-white">
                  NerdShive <span className="text-cyan-400 font-mono text-sm">DevPortal</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">Internal Architecture & Specs</span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-slate-800">
              {isAuthenticated ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Dev Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
                  <Shield className="h-3 w-3 text-amber-400" />
                  Locked
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && <LockPortalButton />}

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to App</span>
            </Link>

            <a
              href="https://github.com/bips241/nerdshive"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
            >
              <Terminal className="h-3.5 w-3.5" />
              GitHub
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area: Protected by Gatekeeper */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isAuthenticated ? (
          children
        ) : (
          <DevLockScreen />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-20 border-t border-slate-800/80 bg-slate-950/60 py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} NerdShive Platform Architecture. Confidential & Open-Standard Engineering.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
              Statutory 180-Day Retained
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Zero-Downtime Rollout
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
