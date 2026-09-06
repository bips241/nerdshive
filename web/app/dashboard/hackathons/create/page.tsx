import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { canCreateHackathon } from '@/lib/rbac';
import CreateHackathonWizardClient from '@/components/hackathons/CreateHackathonWizardClient';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Trophy, Sparkles, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CreateHackathonPage() {
  const session = await auth();

  if (!session?.user?._id) {
    redirect('/login');
  }

  // Strict Backend Role Guard
  const isAuthorized = canCreateHackathon(session.user);

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl border border-border/80 bg-card text-center space-y-5 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            Organizer Authorization Required
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            To prevent spoofed, fraudulent, or clone events, official hackathon hosting is restricted to verified <strong>Organizers</strong> and <strong>Platform Admins</strong>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-secondary/30 border border-border/60 text-left text-xs space-y-2 max-w-lg mx-auto">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-purple-400" /> Are you an official hackathon organizer?
          </span>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Universities, open-source DAOs, student clubs, and tech enterprises can apply for official Organizer status to configure multi-round rubrics, page studio themes, and assign judges.
          </p>
          <div className="pt-2 flex items-center gap-2">
            <Link href="mailto:organizers@nerdshive.online?subject=Organizer%20Access%20Request">
              <Button size="sm" className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                Request Organizer Verification
              </Button>
            </Link>
            <Link href="/dashboard/explore">
              <Button size="sm" variant="ghost" className="text-xs">
                Browse Active Hackathons
              </Button>
            </Link>
          </div>
        </div>

        <div className="pt-2 text-[11px] text-muted-foreground">
          Logged in as: <strong className="text-foreground">@{session.user.user_name}</strong> (Role: <span className="font-mono capitalize text-primary">{session.user.role || 'developer'}</span>)
        </div>
      </div>
    );
  }

  return <CreateHackathonWizardClient />;
}
