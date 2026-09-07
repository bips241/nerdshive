'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';

export default function LockPortalButton() {
  const router = useRouter();
  const [locking, setLocking] = useState(false);

  const handleLock = async () => {
    setLocking(true);
    try {
      await fetch('/api/devs/auth', { method: 'DELETE' });
      router.refresh();
    } catch (_) {
    } finally {
      setLocking(false);
    }
  };

  return (
    <button
      onClick={handleLock}
      disabled={locking}
      title="Lock developer portal and terminate active session"
      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-mono text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/20 transition-all shadow-sm disabled:opacity-50"
    >
      {locking ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Lock className="h-3.5 w-3.5 text-rose-400" />
      )}
      <span className="hidden sm:inline">Lock Portal</span>
    </button>
  );
}
