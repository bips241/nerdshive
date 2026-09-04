'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateProfile } from '@/lib/actions';
import { toast } from 'sonner';
import { Loader2, User, Bell, Shield, Terminal, Save } from 'lucide-react';
import { useTheme } from 'next-themes';

interface SettingsFormProps {
  user: {
    _id: string;
    user_name: string;
    email: string;
    bio?: string;
    website?: string;
    repo?: string;
    radarStatus?: string;
    techStack?: string[];
    createdAt?: string;
  };
}

export default function SettingsForm({ user }: SettingsFormProps) {
  const { theme, setTheme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    user_name: user.user_name || '',
    bio: user.bio || '',
    website: user.website || '',
    repo: user.repo || '',
    radarStatus: user.radarStatus || 'none',
  });

  const [techStackInput, setTechStackInput] = useState((user.techStack || []).join(', '));
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [collabAlerts, setCollabAlerts] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const parsedTech = techStackInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await updateProfile({
        ...formData,
        techStack: parsedTech,
      });

      if (res?.success) {
        toast.success('Account settings saved successfully!');
      } else {
        toast.error(res?.error || 'Failed to save settings.');
      }
    } catch (error: any) {
      console.error('Settings error:', error);
      toast.error(error.message || 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile & Identity Card */}
      <Card className="p-6 space-y-4 bg-card border rounded-2xl">
        <div className="flex items-center gap-2 border-b pb-3">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Public Developer Profile</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="user_name">Username</Label>
            <Input
              id="user_name"
              value={formData.user_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, user_name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" value={user.email} disabled className="bg-muted text-muted-foreground" />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="bio">Bio & Focus</Label>
            <Input
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder="Fullstack Dev • Building distributed systems"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="repo">GitHub Profile or Repo</Label>
            <Input
              id="repo"
              value={formData.repo}
              onChange={(e) => setFormData((prev) => ({ ...prev, repo: e.target.value }))}
              placeholder="https://github.com/username"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="website">Personal Portfolio / Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="https://yourportfolio.dev"
            />
          </div>
        </div>
      </Card>

      {/* Matchmaking & Teammate Radar */}
      <Card className="p-6 space-y-4 bg-card border rounded-2xl">
        <div className="flex items-center gap-2 border-b pb-3">
          <Terminal className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Matchmaking & Teammate Radar</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="radarStatus">Teammate Radar Status</Label>
            <Select
              value={formData.radarStatus}
              onValueChange={(val) => setFormData((prev) => ({ ...prev, radarStatus: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Off (No Live Beacon)</SelectItem>
                <SelectItem value="open_for_hackathons">🎯 Open for Hackathons</SelectItem>
                <SelectItem value="seeking_cofounder">🚀 Seeking Co-Founder</SelectItem>
                <SelectItem value="open_for_collab">🤝 Open for Collab</SelectItem>
                <SelectItem value="open_for_work">💼 Open for Work</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Displays a live pulsing badge on your profile and ranks you higher in teammate discovery.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="techStack">Primary Tech Stack</Label>
            <Input
              id="techStack"
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              placeholder="TypeScript, Next.js, Go, Rust, PyTorch"
            />
            <p className="text-[11px] text-muted-foreground">
              Comma-separated technologies used for complementary skillset matching.
            </p>
          </div>
        </div>
      </Card>

      {/* Notifications & Preferences */}
      <Card className="p-6 space-y-4 bg-card border rounded-2xl">
        <div className="flex items-center gap-2 border-b pb-3">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Preferences & Notifications</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Collaboration Requests Email Alert</Label>
              <p className="text-xs text-muted-foreground">
                Get an email when someone requests to join your hackathon or open source project.
              </p>
            </div>
            <Switch checked={collabAlerts} onCheckedChange={setCollabAlerts} />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Weekly Trending Digest</Label>
              <p className="text-xs text-muted-foreground">
                Receive weekly curated project highlights and upcoming hackathon countdowns.
              </p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Appearance Theme</Label>
              <p className="text-xs text-muted-foreground">Toggle between dark, light, or system theme.</p>
            </div>
            <Select value={theme} onValueChange={(t) => setTheme(t)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} className="font-semibold gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
