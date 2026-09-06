'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import { submitRoundProjectAction } from '@/lib/hackathon-actions';
import { toast } from 'sonner';
import {
  Users,
  Copy,
  Check,
  Code2,
  ExternalLink,
  Video,
  FileText,
  Sparkles,
  Send,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  hackathon: any;
  registration: any;
  onUpdate?: () => void;
}

export default function TeamRoomModal({ isOpen, onClose, hackathon, registration, onUpdate }: Props) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'submit'>('overview');
  const [selectedRound, setSelectedRound] = useState<number>(hackathon?.currentRoundNumber || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingSubmission = (registration?.submissions || []).find(
    (s: any) => s.roundNumber === selectedRound
  );

  const [formData, setFormData] = useState({
    projectTitle: existingSubmission?.projectTitle || '',
    tagline: existingSubmission?.tagline || '',
    description: existingSubmission?.description || '',
    repoUrl: existingSubmission?.repoUrl || '',
    demoUrl: existingSubmission?.demoUrl || '',
    videoUrl: existingSubmission?.videoUrl || '',
    pitchDeckUrl: existingSubmission?.pitchDeckUrl || '',
  });

  const handleCopyCode = () => {
    if (registration?.code) {
      navigator.clipboard.writeText(registration.code);
      setCopied(true);
      toast.success('Team Invite Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectTitle.trim()) {
      toast.error('Project title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitRoundProjectAction(
        hackathon.slug,
        registration._id,
        selectedRound,
        formData
      );

      if (res?.success) {
        toast.success(`Round ${selectedRound} project submitted successfully! 🎉`);
        if (onUpdate) onUpdate();
        setActiveTab('overview');
      } else {
        toast.error(res?.failure || 'Failed to submit project.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!registration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-neutral-950 border-neutral-800 text-foreground">
        <DialogHeader className="border-b border-neutral-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                {registration.teamName}
                {registration.isSolo && <Badge variant="secondary">Solo Hacker</Badge>}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs mt-1">
                Participating in {hackathon.name} • Status:{' '}
                <span className="capitalize font-semibold text-emerald-400">
                  {registration.status}
                </span>
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/dashboard/messages">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 border-purple-500/40 text-purple-400 hover:bg-purple-500/10"
                >
                  <Video className="w-3.5 h-3.5" /> Squad Voice Stage
                </Button>
              </Link>

              {/* Invite Code Box */}
              <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg">
                <span className="text-xs text-muted-foreground">Code:</span>
                <span className="font-mono font-bold text-sm tracking-wider text-purple-400">
                  {registration.code}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyCode}
                  className="h-6 w-6 text-neutral-400 hover:text-white"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-4 pt-2">
            <Button
              variant={activeTab === 'overview' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('overview')}
              className="text-xs"
            >
              Team & Submissions
            </Button>
            <Button
              variant={activeTab === 'submit' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('submit')}
              className="text-xs flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5 text-purple-400" /> Submit Project
            </Button>
          </div>
        </DialogHeader>

        {activeTab === 'overview' && (
          <div className="space-y-6 pt-4">
            {/* Team Roster */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-300 mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Team Members ({registration.members?.length || 1})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {registration.members?.map((m: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800/80"
                  >
                    <UserAvatar user={m.user} className="h-9 w-9 border border-neutral-700" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate text-neutral-200">
                        {m.user?.name || m.user?.user_name || 'Hacker'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{m.user?.user_name} • {m.role || 'Member'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Voluntary Looking-For Skills */}
            {registration.lookingForSkills?.length > 0 && (
              <div className="p-3.5 rounded-lg bg-purple-950/20 border border-purple-900/40">
                <p className="text-xs font-semibold text-purple-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Welcoming Teammates With Skills:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {registration.lookingForSkills.map((s: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-purple-900/30 text-purple-200 border-purple-700/50">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Current Submissions Overview */}
            <div>
              <h3 className="text-sm font-semibold text-neutral-300 mb-3 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-purple-400" /> Round Submissions
              </h3>
              {(!registration.submissions || registration.submissions.length === 0) ? (
                <div className="text-center py-6 border border-dashed border-neutral-800 rounded-lg text-neutral-400 text-xs">
                  No submissions recorded yet. Click <strong>"Submit Project"</strong> to upload your project details.
                </div>
              ) : (
                <div className="space-y-3">
                  {registration.submissions.map((sub: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Round {sub.roundNumber}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Submitted on {new Date(sub.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-neutral-100">{sub.projectTitle}</h4>
                      {sub.tagline && <p className="text-xs text-neutral-400">{sub.tagline}</p>}
                      <div className="flex flex-wrap gap-2 pt-2 text-xs">
                        {sub.repoUrl && (
                          <a
                            href={sub.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-purple-400 hover:underline"
                          >
                            <Code2 className="h-3.5 w-3.5" /> Repository <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {sub.demoUrl && (
                          <a
                            href={sub.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-emerald-400 hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Live Demo
                          </a>
                        )}
                        {sub.videoUrl && (
                          <a
                            href={sub.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-400 hover:underline"
                          >
                            <Video className="h-3.5 w-3.5" /> Demo Video
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'submit' && (
          <form onSubmit={handleSubmitProject} className="space-y-4 pt-4">
            {/* Round Selector */}
            {hackathon.rounds?.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Select Round to Submit
                </label>
                <div className="flex gap-2">
                  {hackathon.rounds.map((r: any) => (
                    <Button
                      key={r.roundNumber}
                      type="button"
                      variant={selectedRound === r.roundNumber ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedRound(r.roundNumber)}
                      className="text-xs"
                    >
                      Round {r.roundNumber}: {r.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Project Title <span className="text-red-400">*</span>
              </label>
              <Input
                placeholder="e.g. NeuralMesh Distributed Relay"
                value={formData.projectTitle}
                onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                required
                className="bg-neutral-900 border-neutral-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Short Tagline
              </label>
              <Input
                placeholder="One-line elevator pitch for your build"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="bg-neutral-900 border-neutral-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Project Overview & Architecture
              </label>
              <Textarea
                placeholder="Describe how it was built, technologies used, challenges overcome..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-neutral-900 border-neutral-800 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                  <Code2 className="h-3.5 w-3.5 text-purple-400" /> GitHub Repo URL
                </label>
                <Input
                  type="url"
                  placeholder="https://github.com/..."
                  value={formData.repoUrl}
                  onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                  className="bg-neutral-900 border-neutral-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-400" /> Live Deployment URL
                </label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={formData.demoUrl}
                  onChange={(e) => setFormData({ ...formData, demoUrl: e.target.value })}
                  className="bg-neutral-900 border-neutral-800 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                  <Video className="h-3.5 w-3.5 text-blue-400" /> Demo Video URL (Loom/YouTube)
                </label>
                <Input
                  type="url"
                  placeholder="https://loom.com/share/..."
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="bg-neutral-900 border-neutral-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-amber-400" /> Pitch Deck URL (Optional)
                </label>
                <Input
                  type="url"
                  placeholder="https://pitch.com/..."
                  value={formData.pitchDeckUrl}
                  onChange={(e) => setFormData({ ...formData, pitchDeckUrl: e.target.value })}
                  className="bg-neutral-900 border-neutral-800 text-sm"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-neutral-800">
              <Button type="button" variant="outline" onClick={() => setActiveTab('overview')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Confirm Submission'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
