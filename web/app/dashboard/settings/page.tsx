import React from 'react';
import { auth } from '@/auth';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { redirect } from 'next/navigation';
import { Settings } from 'lucide-react';
import SettingsForm from './settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?._id) {
    redirect('/login');
  }

  await connectDB();
  const user: any = await User.findById(session.user._id).lean();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Account & Developer Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage your public developer profile, teammate radar beacon, notification triggers, and platform preferences.
        </p>
      </div>

      <SettingsForm
        user={{
          _id: user._id.toString(),
          user_name: user.user_name,
          email: user.email,
          bio: user.bio,
          website: user.website,
          repo: user.repo,
          radarStatus: user.radarStatus,
          techStack: user.techStack,
          organization: user.organization || user.college || '',
          organizationType: user.organizationType || (user.college ? 'university' : 'independent'),
          experienceLevel: user.experienceLevel || 'entry',
          yearsOfExperience: user.yearsOfExperience || 0,
          location: user.location || '',
          timezone: user.timezone || '',
          preferredRole: user.preferredRole || 'Fullstack Developer',
          college: user.college || '',
          createdAt: user.createdAt?.toISOString(),
        }}
      />
    </div>
  );
}
