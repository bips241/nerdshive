'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldAlert, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  Terminal, 
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export default function DevLockScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the developer master password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/devs/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.refresh();
        }, 500);
      } else {
        setError(data.error || 'Access Denied: Incorrect password');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (_) {
      setError('Network error validating developer credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-12">
      {/* Glow effect behind card */}
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-600/20 opacity-75 blur-xl transition-all" />

        <div className={`relative rounded-3xl border border-slate-800 bg-slate-950/90 p-8 shadow-2xl backdrop-blur-2xl transition-transform ${shake ? 'animate-bounce' : ''}`}>
          {/* Top Badge */}
          <div className="mb-6 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-mono font-medium text-cyan-400">
              <Terminal className="h-3.5 w-3.5" />
              <span>Restricted Dev Environment</span>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          </div>

          {/* Icon & Title */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/80 shadow-inner">
              {success ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-400 animate-in zoom-in" />
              ) : (
                <Lock className="h-8 w-8 text-cyan-400" />
              )}
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Developer Authorization Required
            </h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed font-mono">
              System architecture blueprints, microservices scaling models, and database schema evolution rules are strictly isolated for authorized platform engineers.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Developer Master Password</span>
                <KeyRound className="h-3.5 w-3.5 text-slate-500" />
              </label>
              
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter dev access password..."
                  disabled={loading || success}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 pr-11 font-mono text-sm text-white placeholder-slate-500 transition-all focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 px-3.5 py-2.5 text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3.5 py-2.5 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Authorization verified. Unlocking developer portal...</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-mono text-sm font-bold text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : success ? (
                <span>Access Granted</span>
              ) : (
                <>
                  <span>Unlock Dev Portal</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Security Info & Navigation */}
          <div className="mt-6 border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-500">
            <Link 
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Link>

            <span className="font-mono text-[11px] text-slate-600">
              HMAC-SHA256 • 7-Day Session
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
