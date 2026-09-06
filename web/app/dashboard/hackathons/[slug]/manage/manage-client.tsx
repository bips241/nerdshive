'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import UserAvatar from '@/components/UserAvatar';
import JudgingPortalModal from '@/components/hackathons/JudgingPortalModal';
import {
  manageTeamApplicationStatusAction,
  publishRoundResultsAction,
  manageHackathonJudgesAction,
} from '@/lib/hackathon-actions';
import { toast } from 'sonner';
import {
  Users,
  Layers,
  Gavel,
  Radio,
  ExternalLink,
  Code2,
  Video,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Sparkles,
  Trophy,
  UserPlus,
  Trash2,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface Props {
  hackathon: any;
  registrations: any[];
  isOrganizer?: boolean;
  isJudge?: boolean;
}

export default function OrganizerManageClient({
  hackathon,
  registrations,
  isOrganizer = false,
  isJudge = false,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'applications' | 'rounds' | 'judging' | 'judges'>(
    isOrganizer ? 'applications' : 'judging'
  );
  const [selectedRound, setSelectedRound] = useState<number>(hackathon.currentRoundNumber || 1);
  const [selectedTeamForJudging, setSelectedTeamForJudging] = useState<any>(null);
  const [advancingTeamIds, setAdvancingTeamIds] = useState<string[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Judge Management State (Organizers only)
  const [judgeInput, setJudgeInput] = useState('');
  const [isManagingJudge, setIsManagingJudge] = useState(false);

  // Group applications by status
  const pendingTeams = registrations.filter((r) => r.status === 'applied' || r.status === 'forming');
  const acceptedTeams = registrations.filter((r) => r.status === 'accepted');
  const waitlistedTeams = registrations.filter((r) => r.status === 'waitlisted');
  const rejectedTeams = registrations.filter((r) => r.status === 'rejected');

  const handleUpdateStatus = async (registrationId: string, newStatus: 'accepted' | 'waitlisted' | 'rejected') => {
    try {
      const res = await manageTeamApplicationStatusAction(hackathon.slug, registrationId, newStatus);
      if (res?.success) {
        toast.success(`Team status updated to ${newStatus}!`);
        router.refresh();
      } else {
        toast.error(res?.failure || 'Failed to update status.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating application.');
    }
  };

  const handleToggleAdvancingTeam = (id: string) => {
    setAdvancingTeamIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBroadcastResults = async () => {
    setIsBroadcasting(true);
    try {
      const res = await publishRoundResultsAction(
        hackathon.slug,
        selectedRound,
        advancingTeamIds
      );

      if (res?.success) {
        toast.success(`Round ${selectedRound} results broadcasted live! 🎉`);
        router.push(`/dashboard/hackathons/${hackathon.slug}/broadcast`);
      } else {
        toast.error(res?.failure || 'Failed to broadcast results.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error broadcasting results.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleAddJudge = async () => {
    if (!judgeInput.trim()) return;
    setIsManagingJudge(true);
    try {
      const res = await manageHackathonJudgesAction(hackathon.slug, {
        action: 'add',
        judgeIdentifier: judgeInput.trim(),
      });
      if (res?.success) {
        toast.success(res.message || 'Judge assigned successfully!');
        setJudgeInput('');
        router.refresh();
      } else {
        toast.error(res?.failure || 'Failed to assign judge.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error assigning judge.');
    } finally {
      setIsManagingJudge(false);
    }
  };

  const handleRemoveJudge = async (identifier: string) => {
    setIsManagingJudge(true);
    try {
      const res = await manageHackathonJudgesAction(hackathon.slug, {
        action: 'remove',
        judgeIdentifier: identifier,
      });
      if (res?.success) {
        toast.success(res.message || 'Judge removed successfully.');
        router.refresh();
      } else {
        toast.error(res?.failure || 'Failed to remove judge.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error removing judge.');
    } finally {
      setIsManagingJudge(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isOrganizer ? (
              <Badge variant="outline" className="text-purple-400 border-purple-500/30 bg-purple-500/10">
                Organizer Command Center
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10">
                Official Judging Desk
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{hackathon.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {isOrganizer ? 'Hackathon Management Hub' : 'Evaluator & Judging Portal'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/dashboard/hackathons/${hackathon.slug}`} target="_blank">
            <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> View Public Page
            </Button>
          </Link>
          {isOrganizer && (
            <Link href={`/dashboard/hackathons/${hackathon.slug}/broadcast`}>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 animate-pulse" /> Live Arena Broadcast
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-800 pb-2">
        {isOrganizer && (
          <>
            <Button
              variant={activeTab === 'applications' ? 'secondary' : 'ghost'}
              onClick={() => setActiveTab('applications')}
              className="text-xs flex items-center gap-2"
            >
              <Users className="h-4 w-4 text-purple-400" />
              Applications ({registrations.length})
            </Button>
            <Button
              variant={activeTab === 'rounds' ? 'secondary' : 'ghost'}
              onClick={() => setActiveTab('rounds')}
              className="text-xs flex items-center gap-2"
            >
              <Layers className="h-4 w-4 text-emerald-400" />
              Round Pipeline & Advancement
            </Button>
          </>
        )}
        <Button
          variant={activeTab === 'judging' ? 'secondary' : 'ghost'}
          onClick={() => setActiveTab('judging')}
          className="text-xs flex items-center gap-2"
        >
          <Gavel className="h-4 w-4 text-amber-400" />
          Submissions & Rubric Judging
        </Button>
        {isOrganizer && (
          <Button
            variant={activeTab === 'judges' ? 'secondary' : 'ghost'}
            onClick={() => setActiveTab('judges')}
            className="text-xs flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            Judging Panel ({hackathon.judges?.length || 0})
          </Button>
        )}
      </div>

      {/* Tab 1: Applications Kanban */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Accepted Column */}
            <div className="bg-neutral-900/40 border border-emerald-900/30 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="font-bold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Accepted Teams ({acceptedTeams.length})
                </span>
              </div>
              <div className="space-y-3">
                {acceptedTeams.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No accepted teams yet.</p>
                ) : (
                  acceptedTeams.map((team) => (
                    <div key={team._id} className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-neutral-100">{team.teamName}</span>
                        <Badge variant="outline" className="text-[10px] bg-emerald-950/30 text-emerald-300 border-emerald-700/40">
                          Accepted
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {team.members.map((m: any, i: number) => (
                            <UserAvatar key={i} user={m.user} className="h-6 w-6 border border-neutral-900" />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {team.members.length} members • Code: {team.code}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Column */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="font-bold text-xs text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> Pending Review ({pendingTeams.length})
                </span>
              </div>
              <div className="space-y-3">
                {pendingTeams.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No pending applications.</p>
                ) : (
                  pendingTeams.map((team) => (
                    <div key={team._id} className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-neutral-100">{team.teamName}</span>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {team.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {team.members.map((m: any, i: number) => (
                            <UserAvatar key={i} user={m.user} className="h-6 w-6 border border-neutral-900" />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {team.members.length} members
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-900">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(team._id, 'accepted')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 flex-1"
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(team._id, 'waitlisted')}
                          className="text-xs h-7 flex-1"
                        >
                          Waitlist
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Waitlisted / Rejected Column */}
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="font-bold text-xs text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" /> Waitlisted ({waitlistedTeams.length})
                </span>
              </div>
              <div className="space-y-3">
                {waitlistedTeams.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No waitlisted teams.</p>
                ) : (
                  waitlistedTeams.map((team) => (
                    <div key={team._id} className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
                      <span className="font-bold text-sm text-neutral-200">{team.teamName}</span>
                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(team._id, 'accepted')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-6"
                        >
                          Re-Accept
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Round Pipeline & Advancement */}
      {activeTab === 'rounds' && (
        <div className="space-y-6">
          <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-emerald-400" /> Multi-Round Stage Controller
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select qualifying teams from Round {selectedRound} to advance into the next stage.
                </p>
              </div>

              <Button
                disabled={isBroadcasting}
                onClick={handleBroadcastResults}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" /> Advance {advancingTeamIds.length} Teams & Broadcast
              </Button>
            </div>

            {/* Round Switcher */}
            {hackathon.rounds?.length > 1 && (
              <div className="flex gap-2 border-b border-neutral-800 pb-3">
                {hackathon.rounds.map((r: any) => (
                  <Button
                    key={r.roundNumber}
                    variant={selectedRound === r.roundNumber ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedRound(r.roundNumber)}
                    className="text-xs"
                  >
                    Round {r.roundNumber}: {r.name}
                  </Button>
                ))}
              </div>
            )}

            {/* Team Advancement Selection Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 px-3">
                <span>Select Qualifying Teams ({acceptedTeams.length} Total Accepted)</span>
                <span>Average Score</span>
              </div>

              {acceptedTeams.map((team) => (
                <div
                  key={team._id}
                  onClick={() => handleToggleAdvancingTeam(team._id)}
                  className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    advancingTeamIds.includes(team._id)
                      ? 'bg-purple-950/30 border-purple-500 ring-1 ring-purple-500'
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={advancingTeamIds.includes(team._id)}
                      onChange={() => {}}
                      className="h-4 w-4 rounded bg-neutral-900 border-neutral-700 text-purple-500"
                    />
                    <div>
                      <p className="text-sm font-bold text-neutral-100">{team.teamName}</p>
                      <p className="text-xs text-muted-foreground">
                        {team.members.length} members • Current Round: {team.currentRound}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-amber-400">
                      {team.averageScore !== null ? `${team.averageScore} pts` : 'Pending Score'}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      ({team.evaluationCount} judge reviews)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Submissions & Judging Grid */}
      {activeTab === 'judging' && (
        <div className="space-y-6">
          <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl space-y-4">
            <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
              <Gavel className="h-5 w-5 text-amber-400" /> Team Submissions & Scorecards
            </h2>

            <div className="space-y-4">
              {acceptedTeams.map((team) => {
                const sub = (team.submissions || []).find((s: any) => s.roundNumber === selectedRound) ||
                  team.submissions?.[0];

                return (
                  <div
                    key={team._id}
                    className="p-5 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-neutral-100">{team.teamName}</span>
                        {team.trackName && (
                          <Badge variant="secondary" className="text-xs">
                            {team.trackName}
                          </Badge>
                        )}
                      </div>

                      {sub ? (
                        <div>
                          <p className="text-sm font-semibold text-purple-300">{sub.projectTitle}</p>
                          {sub.tagline && <p className="text-xs text-neutral-400">{sub.tagline}</p>}
                          <div className="flex flex-wrap gap-3 pt-2 text-xs">
                            {sub.repoUrl && (
                              <a href={sub.repoUrl} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline flex items-center gap-1">
                                <Code2 className="h-3.5 w-3.5" /> Repo
                              </a>
                            )}
                            {sub.demoUrl && (
                              <a href={sub.demoUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1">
                                <ExternalLink className="h-3.5 w-3.5" /> Demo
                              </a>
                            )}
                            {sub.videoUrl && (
                              <a href={sub.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                                <Video className="h-3.5 w-3.5" /> Video
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-500 italic">No submission yet for this round.</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        onClick={() => setSelectedTeamForJudging(team)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Gavel className="h-3.5 w-3.5" /> Score Team
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Appointed Judging Panel (Organizers Only) */}
      {isOrganizer && activeTab === 'judges' && (
        <div className="space-y-6">
          <div className="p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-400" /> Appointed Judging Panel
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assigned evaluators have backend-enforced permissions to submit official rubric scores for all qualifying teams.
                </p>
              </div>
              <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 self-start sm:self-auto">
                {hackathon.judges?.length || 0} Official Evaluators
              </Badge>
            </div>

            {/* Add Judge Form */}
            <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <UserPlus className="h-4 w-4 text-purple-400" /> Appoint New Judge
              </span>
              <div className="flex gap-2">
                <Input
                  value={judgeInput}
                  onChange={(e) => setJudgeInput(e.target.value)}
                  placeholder="Enter username (e.g. prof_judge) or email"
                  className="text-xs bg-neutral-900 border-neutral-800 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddJudge();
                    }
                  }}
                />
                <Button
                  size="sm"
                  disabled={isManagingJudge || !judgeInput.trim()}
                  onClick={handleAddJudge}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shrink-0"
                >
                  {isManagingJudge ? 'Assigning...' : 'Assign Judge'}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Judges can score submissions, review GitHub repos, and provide rubric feedback. Their scores directly factor into round advancement.
              </p>
            </div>

            {/* Judges List */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Current Judges
              </h3>
              {(!hackathon.judges || hackathon.judges.length === 0) ? (
                <div className="text-center py-8 border border-dashed border-neutral-800 rounded-lg text-xs text-muted-foreground">
                  No judges appointed yet. Use the input above to appoint an evaluator.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hackathon.judges.map((judge: any) => (
                    <div
                      key={judge._id || judge.user_name}
                      className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar user={judge} className="h-8 w-8 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-200 truncate">
                              {judge.name || judge.user_name}
                            </span>
                            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                              Judge
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground truncate block">
                            @{judge.user_name} • {judge.email}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isManagingJudge}
                        onClick={() => handleRemoveJudge(judge.user_name || judge.email)}
                        className="text-neutral-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0 shrink-0"
                        title="Remove Judge"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Judging Scorecard Modal */}
      {selectedTeamForJudging && (
        <JudgingPortalModal
          isOpen={!!selectedTeamForJudging}
          onClose={() => setSelectedTeamForJudging(null)}
          hackathon={hackathon}
          registration={selectedTeamForJudging}
          roundNumber={selectedRound}
          onScored={() => router.refresh()}
        />
      )}
    </div>
  );
}

export { OrganizerManageClient };

