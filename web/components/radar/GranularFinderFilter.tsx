import React, { useState } from 'react';
import {
  Search,
  Filter,
  GraduationCap,
  MapPin,
  Clock,
  Flame,
  Bug,
  Users,
  Send,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Shield,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Building2,
  Trophy,
  Award,
  Briefcase,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import UserAvatar from '@/components/UserAvatar';
import Link from 'next/link';

export interface CandidateCard {
  _id: string;
  name: string;
  user_name: string;
  image?: string;
  bio?: string;
  college?: string;
  organization?: string;
  organizationType?: 'company' | 'university' | 'dao' | 'independent' | 'other';
  experienceLevel?: 'student' | 'entry' | 'mid' | 'senior' | 'lead' | 'founder';
  yearsOfExperience?: number;
  hackathonsAttendedCount?: number;
  hackathonsWonCount?: number;
  hackathonPodiumsCount?: number;
  reputationScore?: number;
  location?: string;
  timezone?: string;
  techStack?: string[];
  debugKarma?: number;
  bugsSolvedCount?: number;
  occupancyStatus?: 'open' | 'occupied';
  acceptingRequests?: boolean;
  preferredRole?: string;
  registrationStatus: 'registered_free_agent' | 'unregistered_community';
  hackathonName?: string;
  registrationId?: string;
  squadRole?: string;
  trackPreference?: string;
  connectionDegree?: 1 | 2 | 3 | 4 | 5;
  affinityScore?: number;
  affinityReason?: string;
  mutualConnectionsCount?: number;
}

export interface SquadCard {
  _id: string;
  teamName: string;
  code: string;
  trackName: string;
  leader: {
    _id: string;
    name: string;
    user_name: string;
    image?: string;
    college?: string;
    organization?: string;
    location?: string;
  };
  membersCount: number;
  maxSquadSize: number;
  rolesNeeded: string[];
  lookingForDescription?: string;
  squadServerId?: string;
}

interface Props {
  candidates: CandidateCard[];
  squads: SquadCard[];
  loading: boolean;
  onFilterChange: (filters: {
    statusFilter: 'all' | 'registered_free_agents' | 'unregistered_community' | 'recruiting_squads';
    organization: string;
    organizationType: 'company' | 'university' | 'dao' | 'independent' | 'other' | 'all';
    experienceLevel: 'student' | 'entry' | 'mid' | 'senior' | 'lead' | 'founder' | 'all';
    onlyWinners: boolean;
    college: string;
    location: string;
    role: string;
    searchQuery: string;
  }) => void;
  onOpenSendOffer: (candidate: CandidateCard) => void;
  onOpenApplyToSquad: (squad: SquadCard) => void;
  onOpenScheduleMeeting: (targetUser: { _id: string; name: string; user_name: string; image?: string }, registrationId?: string) => void;
  onConnectDM: (targetUserId: string) => void;
  isUserLeader: boolean;
}

const ORGANIZATION_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'company', label: '🏢 Companies' },
  { value: 'university', label: '🎓 Universities' },
  { value: 'dao', label: '🌐 DAOs' },
  { value: 'independent', label: '⚡ Independent' },
];

const EXPERIENCE_LEVELS = [
  { value: 'all', label: 'All Levels' },
  { value: 'student', label: '🎓 Student' },
  { value: 'entry', label: '🌱 Entry (0-2y)' },
  { value: 'mid', label: '⚡ Mid (2-5y)' },
  { value: 'senior', label: '🚀 Senior (5+y)' },
  { value: 'lead', label: '👑 Lead / Architect' },
  { value: 'founder', label: '💡 Founder' },
];

const ROLES = [
  'All Roles',
  'Frontend',
  'Backend',
  'Fullstack',
  'AI / ML',
  'Smart Contracts / Web3',
  'Mobile (React Native / Flutter)',
  'UI/UX Design',
  'DevOps / Cloud',
];

export default function GranularFinderFilter({
  candidates,
  squads,
  loading,
  onFilterChange,
  onOpenSendOffer,
  onOpenApplyToSquad,
  onOpenScheduleMeeting,
  onConnectDM,
  isUserLeader,
}: Props) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'registered_free_agents' | 'unregistered_community' | 'recruiting_squads'>('all');
  const [organization, setOrganization] = useState('');
  const [organizationType, setOrganizationType] = useState<string>('all');
  const [experienceLevel, setExperienceLevel] = useState<string>('all');
  const [onlyWinners, setOnlyWinners] = useState<boolean>(false);
  const [location, setLocation] = useState('');
  const [role, setRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const activeFiltersCount =
    (organization ? 1 : 0) +
    (organizationType !== 'all' ? 1 : 0) +
    (experienceLevel !== 'all' ? 1 : 0) +
    (location ? 1 : 0) +
    (role ? 1 : 0) +
    (onlyWinners ? 1 : 0);

  const hasAnyFilter = activeFiltersCount > 0 || searchQuery.trim() !== '' || statusFilter !== 'all';

  const handleApplyFilters = (
    newStatus = statusFilter,
    newOrg = organization,
    newOrgType = organizationType,
    newExpLevel = experienceLevel,
    newOnlyWinners = onlyWinners,
    newLocation = location,
    newRole = role,
    newQuery = searchQuery
  ) => {
    onFilterChange({
      statusFilter: newStatus,
      organization: newOrg === 'All Organizations' ? '' : newOrg,
      organizationType: newOrgType as any,
      experienceLevel: newExpLevel as any,
      onlyWinners: newOnlyWinners,
      college: newOrg === 'All Organizations' ? '' : newOrg,
      location: newLocation,
      role: newRole === 'All Roles' ? '' : newRole,
      searchQuery: newQuery,
    });
  };

  const handleResetAll = () => {
    setOrganization('');
    setOrganizationType('all');
    setExperienceLevel('all');
    setOnlyWinners(false);
    setLocation('');
    setRole('');
    setSearchQuery('');
    setStatusFilter('all');
    handleApplyFilters('all', '', 'all', 'all', false, '', '', '');
  };

  const handleRemoveFilter = (key: string) => {
    if (key === 'organization') {
      setOrganization('');
      handleApplyFilters(statusFilter, '', organizationType, experienceLevel, onlyWinners, location, role, searchQuery);
    } else if (key === 'organizationType') {
      setOrganizationType('all');
      handleApplyFilters(statusFilter, organization, 'all', experienceLevel, onlyWinners, location, role, searchQuery);
    } else if (key === 'experienceLevel') {
      setExperienceLevel('all');
      handleApplyFilters(statusFilter, organization, organizationType, 'all', onlyWinners, location, role, searchQuery);
    } else if (key === 'location') {
      setLocation('');
      handleApplyFilters(statusFilter, organization, organizationType, experienceLevel, onlyWinners, '', role, searchQuery);
    } else if (key === 'role') {
      setRole('');
      handleApplyFilters(statusFilter, organization, organizationType, experienceLevel, onlyWinners, location, '', searchQuery);
    } else if (key === 'onlyWinners') {
      setOnlyWinners(false);
      handleApplyFilters(statusFilter, organization, organizationType, experienceLevel, false, location, role, searchQuery);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Category Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800/80 p-4 sm:p-5 rounded-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Granular Teammate Radar
            </h2>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[11px] px-2 py-0.5">
              Live Verified Network
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Discover verified teammates, free agents, and recruiting squads with zero noise.
          </p>
        </div>

        {/* Status Category Tabs */}
        <div className="flex flex-wrap gap-1 p-1 bg-zinc-950/80 border border-zinc-800 rounded-xl">
          <button
            onClick={() => {
              setStatusFilter('all');
              handleApplyFilters('all');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Discoveries
          </button>
          <button
            onClick={() => {
              setStatusFilter('registered_free_agents');
              handleApplyFilters('registered_free_agents');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === 'registered_free_agents'
                ? 'bg-cyan-950/70 border border-cyan-700/50 text-cyan-300 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-cyan-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Free Agents
          </button>
          <button
            onClick={() => {
              setStatusFilter('unregistered_community');
              handleApplyFilters('unregistered_community');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === 'unregistered_community'
                ? 'bg-purple-950/70 border border-purple-700/50 text-purple-300 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-purple-400'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            Platform Devs
          </button>
          <button
            onClick={() => {
              setStatusFilter('recruiting_squads');
              handleApplyFilters('recruiting_squads');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === 'recruiting_squads'
                ? 'bg-emerald-950/70 border border-emerald-700/50 text-emerald-300 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-emerald-400'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Open Squads
          </button>
        </div>
      </div>

      {/* 2. Sleek Unified Search & Action Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleApplyFilters(statusFilter, organization, organizationType, experienceLevel, onlyWinners, location, role, e.target.value);
              }}
              placeholder="Search by name, skills, tech stack, college, or bio..."
              className="pl-10 pr-8 bg-zinc-900/90 border-zinc-800 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500/50 h-10 rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  handleApplyFilters(statusFilter, organization, organizationType, experienceLevel, onlyWinners, location, role, '');
                }}
                className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Granular Filters Toggle Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={`h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all border shrink-0 ${
              isFiltersOpen || activeFiltersCount > 0
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 shadow-sm'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 font-bold text-[10px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
            {isFiltersOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </Button>

          {/* 🏆 Winners Track Record Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !onlyWinners;
              setOnlyWinners(next);
              handleApplyFilters(statusFilter, organization, organizationType, experienceLevel, next, location, role, searchQuery);
            }}
            className={`h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border shrink-0 ${
              onlyWinners
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <Trophy className={`w-3.5 h-3.5 ${onlyWinners ? 'text-amber-400 fill-amber-400/30' : 'text-zinc-500'}`} />
            <span>🏆 Winners Only</span>
          </button>

          {/* Reset Filters Shortcut */}
          {hasAnyFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              className="h-10 px-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs flex items-center justify-center gap-1.5 shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
        </div>

        {/* Active Filter Pills Bar (Quick Glance & Dismiss) */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-1 py-1">
            <span className="text-[11px] text-zinc-500 font-medium mr-1">Active Filters:</span>
            {organization && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-200">
                Org: <strong className="font-semibold">{organization}</strong>
                <button
                  type="button"
                  onClick={() => handleRemoveFilter('organization')}
                  className="hover:text-red-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {organizationType !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-200">
                Type: <strong className="font-semibold">{ORGANIZATION_TYPES.find((t) => t.value === organizationType)?.label}</strong>
                <button
                  type="button"
                  onClick={() => handleRemoveFilter('organizationType')}
                  className="hover:text-red-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {experienceLevel !== 'all' && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-200">
                Level: <strong className="font-semibold">{EXPERIENCE_LEVELS.find((l) => l.value === experienceLevel)?.label}</strong>
                <button
                  type="button"
                  onClick={() => handleRemoveFilter('experienceLevel')}
                  className="hover:text-red-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {role && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-200">
                Role: <strong className="font-semibold">{role}</strong>
                <button
                  type="button"
                  onClick={() => handleRemoveFilter('role')}
                  className="hover:text-red-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded-full text-zinc-200">
                Location: <strong className="font-semibold">{location}</strong>
                <button
                  type="button"
                  onClick={() => handleRemoveFilter('location')}
                  className="hover:text-red-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {onlyWinners && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300">
                🏆 Winners Track Record
                <button
                  type="button"
                  onClick={() => handleRemoveFilter('onlyWinners')}
                  className="hover:text-red-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleResetAll}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 underline ml-2 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Collapsible Granular Control Panel (The Command Deck) */}
        {isFiltersOpen && (
          <div className="bg-zinc-900/95 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Granular Teammate Filters</h3>
                <span className="text-xs text-zinc-500 hidden sm:inline">· Pinpoint exact developer attributes</span>
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFiltersOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Row 1: Organization & Alma Mater */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  Organization / Alma Mater
                </label>
                <Input
                  value={organization}
                  onChange={(e) => {
                    setOrganization(e.target.value);
                    handleApplyFilters(statusFilter, e.target.value, organizationType, experienceLevel, onlyWinners, location, role, searchQuery);
                  }}
                  placeholder="e.g. Stanford, Google, IIT Bombay, Superteam..."
                  className="bg-zinc-950 border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500/50 h-9"
                />
                {/* Popular Org Quick Suggestions */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {['Stanford', 'MIT', 'Google', 'IIT Bombay', 'Berkeley', 'Meta', 'Superteam'].map((orgName) => (
                    <button
                      key={orgName}
                      type="button"
                      onClick={() => {
                        setOrganization(orgName);
                        handleApplyFilters(statusFilter, orgName, organizationType, experienceLevel, onlyWinners, location, role, searchQuery);
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                        organization.toLowerCase() === orgName.toLowerCase()
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      {orgName}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-purple-400" />
                  Organization Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {ORGANIZATION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        setOrganizationType(t.value);
                        handleApplyFilters(statusFilter, organization, t.value, experienceLevel, onlyWinners, location, role, searchQuery);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-all ${
                        organizationType === t.value
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 font-semibold shadow-sm'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 2: Role, Seniority, Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/60">
              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                  Technical Role
                </label>
                <select
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    handleApplyFilters(statusFilter, organization, organizationType, experienceLevel, onlyWinners, location, e.target.value, searchQuery);
                  }}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 h-9 cursor-pointer"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r === 'All Roles' ? '' : r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                  Seniority & Level
                </label>
                <select
                  value={experienceLevel}
                  onChange={(e) => {
                    setExperienceLevel(e.target.value);
                    handleApplyFilters(statusFilter, organization, organizationType, e.target.value, onlyWinners, location, role, searchQuery);
                  }}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 h-9 cursor-pointer"
                >
                  {EXPERIENCE_LEVELS.map((exp) => (
                    <option key={exp.value} value={exp.value}>
                      {exp.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Location or Timezone
                </label>
                <Input
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    handleApplyFilters(statusFilter, organization, organizationType, experienceLevel, onlyWinners, e.target.value, role, searchQuery);
                  }}
                  placeholder="e.g. San Francisco, Tokyo, UTC+5..."
                  className="bg-zinc-950 border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500/50 h-9"
                />
              </div>
            </div>

            {/* Panel Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs">
              <span className="text-zinc-400">
                Found <strong className="text-white">{candidates.length + squads.length}</strong> matching candidates
              </span>
              <Button
                size="sm"
                onClick={() => setIsFiltersOpen(false)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 h-8 rounded-lg font-semibold"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Results Grid */}
      {loading ? (
        <div className="py-16 text-center text-zinc-400">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">Scanning verified hackathon registry & community database...</p>
        </div>
      ) : candidates.length === 0 && squads.length === 0 ? (
        <div className="py-16 text-center bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-8">
          <Users className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No candidates match your current filters</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
            Try broadening your search or clear filters to see all available developers on the live network.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            className="mt-4 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Show All Discoveries
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Candidates Section */}
          {candidates.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Available Candidates ({candidates.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {candidates.map((c) => {
                  const isFreeAgent = c.registrationStatus === 'registered_free_agent';
                  return (
                    <div
                      key={c._id}
                      className="group bg-zinc-900/70 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 rounded-2xl p-4 flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Row: Avatar & Status Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              user={{
                                name: c.name,
                                image: c.image,
                                user_name: c.user_name,
                              }}
                              className="w-12 h-12 rounded-xl ring-2 ring-zinc-800 group-hover:ring-emerald-500/40 transition-all"
                            />
                            <div>
                              <Link
                                href={`/user/${c.user_name}`}
                                className="font-semibold text-white text-sm hover:underline flex items-center gap-1"
                              >
                                {c.name}
                                <ExternalLink className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Link>
                              <p className="text-xs text-zinc-400">@{c.user_name}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {isFreeAgent ? (
                              <Badge className="bg-cyan-500/10 border-cyan-500/30 text-cyan-300 text-[10px] px-2 py-0.5 font-medium whitespace-nowrap">
                                ⚡ Free Agent
                              </Badge>
                            ) : (
                              <Badge className="bg-purple-500/10 border-purple-500/30 text-purple-300 text-[10px] px-2 py-0.5 font-medium whitespace-nowrap">
                                🌐 Platform Dev
                              </Badge>
                            )}
                            {c.connectionDegree === 1 && (
                              <span className="inline-flex items-center text-[10px] font-semibold text-emerald-400">
                                1st Degree
                              </span>
                            )}
                            {c.connectionDegree === 2 && (
                              <span className="inline-flex items-center text-[10px] font-semibold text-cyan-400">
                                2nd Degree{c.mutualConnectionsCount ? ` · ${c.mutualConnectionsCount} mutual` : ''}
                              </span>
                            )}
                            {c.connectionDegree === 3 && c.affinityReason && (
                              <span className="inline-flex items-center text-[10px] font-medium text-purple-300">
                                {c.affinityReason}
                              </span>
                            )}
                            {c.connectionDegree === 4 && (
                              <span className="inline-flex items-center text-[10px] font-medium text-amber-300/80">
                                Timezone Match
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Metadata Pills: Organization/Company/University, Location, Role */}
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {(c.organization || c.college) && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-zinc-800/80 border border-zinc-700/60 rounded-md text-zinc-200 font-medium">
                              {c.organizationType === 'company' ? (
                                <Building2 className="w-3 h-3 text-cyan-400" />
                              ) : c.organizationType === 'dao' ? (
                                <Sparkles className="w-3 h-3 text-purple-400" />
                              ) : (
                                <GraduationCap className="w-3 h-3 text-emerald-400" />
                              )}
                              {c.organization || c.college}
                              {c.experienceLevel && (
                                <span className="text-[10px] text-zinc-400 font-normal ml-0.5">
                                  ({c.experienceLevel}{c.yearsOfExperience ? `, ${c.yearsOfExperience}y` : ''})
                                </span>
                              )}
                            </span>
                          )}
                          {c.location && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-zinc-800/80 border border-zinc-700/60 rounded-md text-zinc-300">
                              <MapPin className="w-3 h-3 text-cyan-400" />
                              {c.location}
                            </span>
                          )}
                          {c.timezone && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-zinc-800/80 border border-zinc-700/60 rounded-md text-zinc-300">
                              <Clock className="w-3 h-3 text-amber-400" />
                              {c.timezone}
                            </span>
                          )}
                        </div>

                        {/* Bio */}
                        {c.bio && (
                          <p className="text-xs text-zinc-400 mt-2.5 line-clamp-2 leading-relaxed">
                            {c.bio}
                          </p>
                        )}

                        {/* Tech Stack */}
                        {c.techStack && c.techStack.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {c.techStack.slice(0, 4).map((tech) => (
                              <span
                                key={tech}
                                className="text-[10px] px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-zinc-400 font-mono"
                              >
                                {tech}
                              </span>
                            ))}
                            {c.techStack.length > 4 && (
                              <span className="text-[10px] px-1.5 py-0.5 text-zinc-500 font-mono">
                                +{c.techStack.length - 4}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Verified Performance Track Record & MOAT Metrics */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-zinc-800/80 text-[11px] font-mono">
                          {(c.hackathonsWonCount || 0) > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-[10px]">
                              <Trophy className="w-3 h-3 text-amber-400" />
                              {c.hackathonsWonCount}x Winner
                            </span>
                          )}
                          {(c.hackathonPodiumsCount || 0) > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px]">
                              <Award className="w-3 h-3 text-cyan-400" />
                              {c.hackathonPodiumsCount} Podiums
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-amber-400">
                            <Flame className="w-3 h-3" />
                            {c.reputationScore || (c.debugKarma || 0) * 2} rep
                          </span>
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Bug className="w-3 h-3" />
                            {c.bugsSolvedCount || 0} solved
                          </span>
                          {(c.hackathonsAttendedCount || 0) > 0 && (
                            <span className="text-zinc-500 text-[10px]">
                              ({c.hackathonsAttendedCount} events)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-800/80">
                        <Button
                          size="sm"
                          onClick={() => onOpenSendOffer(c)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-2 flex items-center justify-center gap-1 h-8 rounded-lg shadow-sm"
                        >
                          <Send className="w-3 h-3" />
                          Offer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onOpenScheduleMeeting(
                              {
                                _id: c._id,
                                name: c.name,
                                user_name: c.user_name,
                                image: c.image,
                              },
                              c.registrationId
                            )
                          }
                          className="border-zinc-700 hover:border-zinc-600 text-zinc-200 text-xs px-2 flex items-center justify-center gap-1 h-8 rounded-lg"
                        >
                          <Calendar className="w-3 h-3 text-cyan-400" />
                          Meet
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onConnectDM(c._id)}
                          className="text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs px-2 flex items-center justify-center gap-1 h-8 rounded-lg"
                        >
                          <MessageSquare className="w-3 h-3" />
                          DM
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Open Squads Section */}
          {squads.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  Recruiting Squads ({squads.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {squads.map((s) => (
                  <div
                    key={s._id}
                    className="group bg-zinc-900/70 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 rounded-2xl p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                            {s.teamName}
                          </h4>
                          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                            Track: {s.trackName}
                          </p>
                        </div>
                        <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 text-[10px] px-2 py-0.5 font-mono">
                          {s.membersCount} / {s.maxSquadSize} Hackers
                        </Badge>
                      </div>

                      {/* Leader Bio Snippet */}
                      <div className="flex items-center gap-2 mt-3 p-2 bg-zinc-950/70 border border-zinc-800/80 rounded-xl">
                        <UserAvatar
                          user={s.leader}
                          className="w-7 h-7 rounded-lg"
                        />
                        <div className="text-[11px] truncate">
                          <span className="text-zinc-400">Lead: </span>
                          <span className="text-zinc-200 font-medium">
                            {s.leader?.name || 'Squad Lead'}
                          </span>
                          {(s.leader?.organization || s.leader?.college) && (
                            <span className="text-zinc-500 ml-1">({s.leader.organization || s.leader.college})</span>
                          )}
                        </div>
                      </div>

                      {s.lookingForDescription && (
                        <p className="text-xs text-zinc-400 mt-2.5 line-clamp-2 leading-relaxed">
                          "{s.lookingForDescription}"
                        </p>
                      )}

                      {/* Roles Needed */}
                      {s.rolesNeeded.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1.5">
                            Roles Needed:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {s.rolesNeeded.map((role) => (
                              <span
                                key={role}
                                className="text-[10px] px-2 py-0.5 bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 rounded-md font-medium"
                              >
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Squad Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-800/80">
                      <Button
                        size="sm"
                        onClick={() => onOpenApplyToSquad(s)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-2 flex items-center justify-center gap-1 h-8 rounded-lg shadow-sm"
                      >
                        <Users className="w-3 h-3" />
                        Apply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onOpenScheduleMeeting(
                            {
                              _id: s.leader._id,
                              name: s.leader.name,
                              user_name: s.leader.user_name,
                              image: s.leader.image,
                            },
                            s._id
                          )
                        }
                        className="border-zinc-700 hover:border-zinc-600 text-zinc-200 text-xs px-2 flex items-center justify-center gap-1 h-8 rounded-lg"
                      >
                        <Calendar className="w-3 h-3 text-cyan-400" />
                        Meet
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onConnectDM(s.leader._id)}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs px-2 flex items-center justify-center gap-1 h-8 rounded-lg"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Lead
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
