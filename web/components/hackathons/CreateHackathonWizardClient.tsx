'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { createHackathonEventAction } from '@/lib/hackathon-actions';
import { toast } from 'sonner';
import {
  Trophy,
  Layers,
  Palette,
  Gavel,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Globe,
} from 'lucide-react';

export default function CreateHackathonWizardClient() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    description: '',
    organizationType: 'community' as 'college' | 'community' | 'enterprise' | 'individual',
    websiteUrl: '',
    devpostUrl: '',
    location: 'Virtual / Global',
    submissionDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 16),
    prizePool: '$10,000 in Grants & Bounties',
    applicationMode: 'open' as 'open' | 'curated',
    registrationType: 'both' as 'both' | 'team_only' | 'solo_only',
    teamMin: 1,
    teamMax: 4,
    isBlindJudging: false,
    heroTheme: 'cyberpunk' as 'cyberpunk' | 'dark_minimal' | 'modern_purple' | 'emerald_tech',
    bannerUrl: '',
    logoUrl: '',
    tracks: [
      { name: 'AI & Autonomous Agents', prizePool: '$5,000', description: 'Intelligent multi-agent systems and tooling.' },
      { name: 'Open Innovation & Web3', prizePool: '$5,000', description: 'Decentralized applications and public goods.' },
    ],
    rounds: [
      {
        roundNumber: 1,
        name: 'Prototype & Code Submission',
        description: 'Submit your working MVP, GitHub repository, and live deployment link.',
        submissionType: 'prototype' as 'ideation' | 'prototype' | 'video_pitch' | 'custom',
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 16),
        isElimination: false,
        advancingCount: 10,
        rubric: [
          { criterion: 'Technical Execution', maxScore: 10, weight: 1, description: 'Code quality and architecture.' },
          { criterion: 'Originality & Impact', maxScore: 10, weight: 1, description: 'Novelty of solution.' },
        ],
      },
    ],
    rules: [
      'All code must be written during the official hackathon sprint.',
      'Teams must submit an open-source repository and public demo link.',
    ],
  });

  // Track manipulation
  const handleAddTrack = () => {
    setFormData((prev) => ({
      ...prev,
      tracks: [...prev.tracks, { name: 'New Track', prizePool: '$1,000', description: 'Track details' }],
    }));
  };

  const handleRemoveTrack = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((_, i) => i !== index),
    }));
  };

  // Round manipulation
  const handleAddRound = () => {
    const nextRoundNumber = formData.rounds.length + 1;
    setFormData((prev) => ({
      ...prev,
      rounds: [
        ...prev.rounds,
        {
          roundNumber: nextRoundNumber,
          name: `Round ${nextRoundNumber}: Final Showcase`,
          description: 'Live presentation or video pitch to official judges.',
          submissionType: 'video_pitch',
          deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString().slice(0, 16),
          isElimination: true,
          advancingCount: 3,
          rubric: [
            { criterion: 'Pitch Delivery', maxScore: 10, weight: 1, description: 'Clarity and demonstration.' },
            { criterion: 'Business Viability', maxScore: 10, weight: 1, description: 'Market impact.' },
          ],
        },
      ],
    }));
  };

  const handleRemoveRound = (index: number) => {
    if (formData.rounds.length <= 1) {
      toast.error('A hackathon must have at least 1 evaluation round.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      rounds: prev.rounds.filter((_, i) => i !== index),
    }));
  };

  // Submit Wizard
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Hackathon name is required.');
      setCurrentStep(1);
      return;
    }
    if (!formData.websiteUrl.trim()) {
      toast.error('Official website URL is required.');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createHackathonEventAction({
        name: formData.name,
        tagline: formData.tagline || 'A high-impact hackathon hosted on NerdShive',
        description: formData.description || 'Welcome to the official hackathon sprint.',
        organizationType: formData.organizationType,
        websiteUrl: formData.websiteUrl,
        devpostUrl: formData.devpostUrl,
        location: formData.location,
        submissionDeadline: formData.submissionDeadline,
        prizePool: formData.prizePool,
        applicationMode: formData.applicationMode,
        registrationType: formData.registrationType,
        teamSize: { min: Number(formData.teamMin), max: Number(formData.teamMax) },
        tracks: formData.tracks,
        rules: formData.rules,
        rounds: formData.rounds,
        pageDesign: {
          heroTheme: formData.heroTheme,
          bannerUrl: formData.bannerUrl,
          logoUrl: formData.logoUrl,
        },
        isBlindJudging: formData.isBlindJudging,
      });

      if (res?.success) {
        toast.success('Hackathon event registered successfully!');
        router.push(`/dashboard/hackathons/${res.slug}`);
      } else {
        toast.error(res?.failure || 'Failed to register hackathon.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Wizard Header */}
      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
          <Sparkles className="w-3.5 h-3.5" /> Organizer Studio
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Host an Official Hackathon Event
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure multi-round pipelines, custom rubric criteria, tracks, and themed landing pages.
        </p>
      </div>

      {/* Step Progress Indicators */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
        {[
          { step: 1, label: 'Event Basics', icon: Trophy },
          { step: 2, label: 'Tracks & Prizes', icon: Layers },
          { step: 3, label: 'Rounds & Rubric', icon: Gavel },
          { step: 4, label: 'Studio Theme', icon: Palette },
        ].map((s) => (
          <button
            key={s.step}
            onClick={() => setCurrentStep(s.step)}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
              currentStep === s.step
                ? 'bg-purple-600/15 border-purple-500 text-purple-400'
                : currentStep > s.step
                ? 'bg-secondary/40 border-border text-foreground'
                : 'bg-card/40 border-border/60 text-muted-foreground opacity-60'
            }`}
          >
            <s.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Wizard Steps Content */}
      <div className="p-6 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm space-y-6 shadow-sm">
        {/* STEP 1: BASICS */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-purple-400" /> Event Identity & Schedule
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Event Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. AI Agents Global Hackathon 2026"
                  className="bg-secondary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Organizer Organization Type</label>
                <select
                  value={formData.organizationType}
                  onChange={(e) => setFormData({ ...formData, organizationType: e.target.value as any })}
                  className="w-full h-10 px-3 rounded-md bg-secondary/30 border text-xs text-foreground focus:outline-none"
                >
                  <option value="college">University / College Society</option>
                  <option value="community">Open Source Community</option>
                  <option value="enterprise">Tech Enterprise / Startup</option>
                  <option value="individual">Individual Founder</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Tagline</label>
              <Input
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="e.g. Build autonomous multi-agent swarms with open models"
                className="bg-secondary/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description & Overview</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Comprehensive overview, challenge statement, eligibility criteria, and mentorship details."
                rows={4}
                className="bg-secondary/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Official Website URL *</label>
                <Input
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  placeholder="https://myhackathon.io"
                  className="bg-secondary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Devpost / External URL (Optional)</label>
                <Input
                  value={formData.devpostUrl}
                  onChange={(e) => setFormData({ ...formData, devpostUrl: e.target.value })}
                  placeholder="https://myhackathon.devpost.com"
                  className="bg-secondary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Location / Venue</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. San Francisco & Virtual Hybrid"
                  className="bg-secondary/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Official Submission Deadline *</label>
                <Input
                  type="datetime-local"
                  value={formData.submissionDeadline}
                  onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
                  className="bg-secondary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Total Prize Pool</label>
                <Input
                  value={formData.prizePool}
                  onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                  placeholder="e.g. $50,000 in Prizes & Grants"
                  className="bg-secondary/30"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: TRACKS */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" /> Challenge Tracks & Prize Allocations
              </h2>
              <Button size="sm" variant="outline" onClick={handleAddTrack} className="text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Track
              </Button>
            </div>

            <div className="space-y-3">
              {formData.tracks.map((track, i) => (
                <div key={i} className="p-4 rounded-xl border border-border/70 bg-secondary/20 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Input
                      value={track.name}
                      onChange={(e) => {
                        const next = [...formData.tracks];
                        next[i].name = e.target.value;
                        setFormData({ ...formData, tracks: next });
                      }}
                      placeholder="Track Name"
                      className="font-semibold text-sm bg-background/60"
                    />
                    <Input
                      value={track.prizePool}
                      onChange={(e) => {
                        const next = [...formData.tracks];
                        next[i].prizePool = e.target.value;
                        setFormData({ ...formData, tracks: next });
                      }}
                      placeholder="Prize (e.g. $5,000)"
                      className="w-36 text-xs bg-background/60"
                    />
                    {formData.tracks.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveTrack(i)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <Input
                    value={track.description}
                    onChange={(e) => {
                      const next = [...formData.tracks];
                      next[i].description = e.target.value;
                      setFormData({ ...formData, tracks: next });
                    }}
                    placeholder="Track challenge description & requirements"
                    className="text-xs bg-background/60"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: ROUNDS & RUBRICS */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-purple-400" /> Evaluation Pipeline & Rubrics
                </h2>
                <p className="text-xs text-muted-foreground">
                  Multi-round elimination with weighted criteria.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleAddRound} className="text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add Round
              </Button>
            </div>

            <div className="space-y-4">
              {formData.rounds.map((round, i) => (
                <div key={i} className="p-4 rounded-xl border border-border/70 bg-secondary/20 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Round {round.roundNumber}
                    </span>
                    <Input
                      value={round.name}
                      onChange={(e) => {
                        const next = [...formData.rounds];
                        next[i].name = e.target.value;
                        setFormData({ ...formData, rounds: next });
                      }}
                      placeholder="Round Title"
                      className="font-semibold text-sm bg-background/60"
                    />
                    <select
                      value={round.submissionType}
                      onChange={(e) => {
                        const next = [...formData.rounds];
                        next[i].submissionType = e.target.value as any;
                        setFormData({ ...formData, rounds: next });
                      }}
                      className="h-9 px-3 rounded-md bg-secondary/50 border text-xs text-foreground"
                    >
                      <option value="prototype">Prototype & Code</option>
                      <option value="ideation">Ideation / Pitch Deck</option>
                      <option value="video_pitch">Video Demo</option>
                      <option value="custom">Custom Criteria</option>
                    </select>
                    {formData.rounds.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveRound(i)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <Input
                    value={round.description}
                    onChange={(e) => {
                      const next = [...formData.rounds];
                      next[i].description = e.target.value;
                      setFormData({ ...formData, rounds: next });
                    }}
                    placeholder="Round submission expectations"
                    className="text-xs bg-background/60"
                  />

                  {/* Rubric Items */}
                  <div className="pt-2 space-y-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Rubric Criteria (Max 10 Points Each)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {round.rubric.map((rubric, rIdx) => (
                        <div
                          key={rIdx}
                          className="p-2.5 rounded-lg border border-border/50 bg-background/60 text-xs flex items-center justify-between"
                        >
                          <span className="font-semibold text-foreground">{rubric.criterion}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Weight: {rubric.weight}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Blind Judging Switch */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-secondary/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-foreground block">Blind Judging Mode</span>
                <span className="text-[11px] text-muted-foreground">
                  Hides participant names, colleges, and social avatars from judges during rubric scoring.
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.isBlindJudging}
                onChange={(e) => setFormData({ ...formData, isBlindJudging: e.target.checked })}
                className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* STEP 4: STUDIO DESIGN */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-400" /> Landing Page Theme & Branding
            </h2>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Hero Visual Theme</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'cyberpunk', name: 'Cyberpunk Neon', accent: 'from-purple-900 to-indigo-950' },
                  { id: 'dark_minimal', name: 'Dark Minimal', accent: 'from-neutral-900 to-black' },
                  { id: 'modern_purple', name: 'Modern Purple', accent: 'from-violet-950 to-purple-900' },
                  { id: 'emerald_tech', name: 'Emerald Tech', accent: 'from-emerald-950 to-teal-950' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFormData({ ...formData, heroTheme: t.id as any })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.heroTheme === t.id
                        ? 'border-purple-500 ring-1 ring-purple-500 bg-purple-500/10'
                        : 'border-border/60 bg-secondary/20 hover:bg-secondary/40'
                    }`}
                  >
                    <div className={`h-8 rounded-lg bg-gradient-to-r ${t.accent} mb-2 border border-white/10`} />
                    <span className="text-xs font-semibold text-foreground block">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Custom Banner Image URL (Optional)</label>
              <Input
                value={formData.bannerUrl}
                onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="bg-secondary/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Logo / Badge Image URL (Optional)</label>
              <Input
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="bg-secondary/30"
              />
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <Button
            size="sm"
            variant="ghost"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((p) => p - 1)}
            className="text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>

          {currentStep < 4 ? (
            <Button
              size="sm"
              onClick={() => setCurrentStep((p) => p + 1)}
              className="text-xs gap-1.5 font-semibold bg-purple-600 hover:bg-purple-700 text-white"
            >
              Next Step <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Publishing Event...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Publish Official Hackathon
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
