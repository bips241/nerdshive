'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Peer, { DataConnection } from 'peerjs';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  SkipForward,
  Code2,
  Copy,
  Check,
  Sparkles,
  Terminal,
  Users,
  Trophy,
  ExternalLink,
  UserPlus,
  RefreshCw,
  Zap,
  Github,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import UserAvatar from '@/components/UserAvatar';
import { toast } from 'sonner';
import { getSocketServerUrl, getPeerServerConfig } from '@/lib/webrtc-utils';

interface IntentMode {
  id: string;
  label: string;
  badge: string;
  description: string;
  icon: any;
  colorClass: string;
  defaultTemplate: string;
}

const RADAR_MODES: Record<string, IntentMode> = {
  project_teammate: {
    id: 'project_teammate',
    label: '⚡ Hackathon Teammate Scout',
    badge: 'Hackathon Scout',
    description: 'Match with frontend, backend, or AI builders looking for hackathon teammates.',
    icon: Users,
    colorClass: 'text-purple-400',
    defaultTemplate: `# 🚀 Hackathon Project & Squad Match
## Target Hackathon: HackMIT 2026 / ETHGlobal
- Desired Track: AI Agents / Web3 / Open Source
- Skills We Need: React, Rust, Solidity, FastAPI
- Project Idea: Collaborative dev tools with live AI orchestration.
`,
  },
  pair_debug: {
    id: 'pair_debug',
    label: '💻 Open Source & Pair Hacker',
    badge: 'Pair Hacker',
    description: 'Serendipitous 1-on-1 coding, algorithm practice, and code review.',
    icon: Terminal,
    colorClass: 'text-emerald-400',
    defaultTemplate: `// TypeScript / JavaScript Scratchpad
// Work on algorithms or review open-source code together:

function analyzeArchitecture(nodes: string[]): boolean {
  console.log('Pair-programming live on NerdShive Radar!');
  return nodes.length > 0;
}
`,
  },
};

interface Props {
  currentUser: {
    _id: string;
    user_name: string;
    name: string;
    image?: string;
    bio?: string;
    skills?: string[];
  };
}

export default function RadarMatchClient({ currentUser }: Props) {
  const searchParams = useSearchParams();
  const initialMode = searchParams?.get('mode') === 'pair_debug' ? 'pair_debug' : 'project_teammate';

  const [activeMode, setActiveMode] = useState<string>(initialMode);
  const [searching, setSearching] = useState(false);
  const [connected, setConnected] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Partner Profile State
  const [partnerProfile, setPartnerProfile] = useState<any>(null);

  // Media States
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Workspace
  const [workspaceCode, setWorkspaceCode] = useState(RADAR_MODES[initialMode].defaultTemplate);
  const [copiedCode, setCopiedCode] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const activeCallRef = useRef<any>(null);
  const dataConnectionRef = useRef<DataConnection | null>(null);
  const timerRef = useRef<any>(null);

  const teardownConnections = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (activeCallRef.current) {
      try { activeCallRef.current.close(); } catch (_) {}
      activeCallRef.current = null;
    }
    if (dataConnectionRef.current) {
      try { dataConnectionRef.current.close(); } catch (_) {}
      dataConnectionRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.emit('leave_queue', { intent: activeMode });
    }
  }, [activeMode]);

  const joinQueue = useCallback(() => {
    teardownConnections();
    setSearching(true);
    setConnected(false);
    setPartnerProfile(null);
    setElapsedSeconds(0);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    if (socketRef.current && peerRef.current?.id) {
      socketRef.current.emit('join_queue', {
        intent: activeMode,
        peerId: peerRef.current.id,
        user: currentUser,
      });
    }
  }, [activeMode, currentUser, teardownConnections]);

  const handleSkip = () => {
    if (socketRef.current) {
      socketRef.current.emit('skip');
    }
    joinQueue();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(workspaceCode);
    setCopiedCode(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCodeChange = (newCode: string) => {
    setWorkspaceCode(newCode);
    if (dataConnectionRef.current && dataConnectionRef.current.open) {
      dataConnectionRef.current.send({
        type: 'CODE_SYNC',
        code: newCode,
      });
    }
  };

  // Initialize WebRTC & Socket Gateway
  useEffect(() => {
    let isSubscribed = true;

    async function initRadar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isSubscribed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const socketUrl = getSocketServerUrl();
        const socket = io(socketUrl, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          withCredentials: true,
        });
        socketRef.current = socket;

        const peerConfig = getPeerServerConfig();
        const generatedPeerId = `radar_${currentUser._id.slice(-6)}_${Math.random().toString(36).slice(2, 6)}`;
        const peer = new Peer(generatedPeerId, peerConfig as any);
        peerRef.current = peer;

        const setupDataConnection = (conn: DataConnection) => {
          dataConnectionRef.current = conn;
          conn.on('open', () => {
            // Exchange profile metadata upon data channel open
            conn.send({
              type: 'PROFILE_EXCHANGE',
              profile: currentUser,
            });
          });

          conn.on('data', (data: any) => {
            if (data?.type === 'CODE_SYNC') {
              setWorkspaceCode(data.code);
            } else if (data?.type === 'PROFILE_EXCHANGE') {
              setPartnerProfile(data.profile);
            }
          });
        };

        peer.on('open', (pId) => {
          if (!isSubscribed) return;
          console.log('[RADAR] Peer ready:', pId);
          socket.emit('join_queue', { intent: activeMode, peerId: pId, user: currentUser });
          setSearching(true);
        });

        peer.on('connection', (conn) => {
          setupDataConnection(conn);
        });

        peer.on('call', (call) => {
          activeCallRef.current = call;
          call.answer(localStreamRef.current || undefined);

          call.on('stream', (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setConnected(true);
            setSearching(false);
          });

          call.on('close', () => {
            setConnected(false);
            setPartnerProfile(null);
          });
        });

        socket.on('match_found', ({ peerId: targetPeerId, isInitiator }) => {
          if (!isSubscribed) return;
          console.log('[RADAR] Match found with:', targetPeerId, 'Initiator:', isInitiator);

          if (isInitiator && localStreamRef.current) {
            const conn = peer.connect(targetPeerId);
            setupDataConnection(conn);

            const call = peer.call(targetPeerId, localStreamRef.current);
            activeCallRef.current = call;

            call.on('stream', (remoteStream) => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
              }
              setConnected(true);
              setSearching(false);
            });

            call.on('close', () => {
              setConnected(false);
              setPartnerProfile(null);
            });
          }
        });

        socket.on('left', () => {
          if (!isSubscribed) return;
          setConnected(false);
          setPartnerProfile(null);
          toast.info('Developer has disconnected. Searching for next match...');
          joinQueue();
        });
      } catch (err) {
        console.error('[RADAR] Initialization error:', err);
        toast.error('Unable to access camera or connect to Pair Radar signaling.');
      }
    }

    initRadar();

    return () => {
      isSubscribed = false;
      teardownConnections();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (peerRef.current) {
        try { peerRef.current.destroy(); } catch (_) {}
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [activeMode, currentUser, joinQueue, teardownConnections]);

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsAudioMuted(!track.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsVideoDisabled(!track.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const newTrack = camStream.getVideoTracks()[0];
        if (activeCallRef.current?.peerConnection) {
          const sender = activeCallRef.current.peerConnection.getSenders().find((s: any) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(newTrack);
        }
        if (localStreamRef.current) {
          const oldTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldTrack) oldTrack.stop();
          localStreamRef.current.removeTrack(oldTrack);
          localStreamRef.current.addTrack(newTrack);
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        setIsScreenSharing(false);
      } catch (err) {
        console.error(err);
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        if (activeCallRef.current?.peerConnection) {
          const sender = activeCallRef.current.peerConnection.getSenders().find((s: any) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }
        if (localStreamRef.current) {
          const oldTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldTrack) oldTrack.stop();
          localStreamRef.current.removeTrack(oldTrack);
          localStreamRef.current.addTrack(screenTrack);
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        screenTrack.onended = () => toggleScreenShare();
        setIsScreenSharing(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-foreground flex flex-col">
      {/* Top Session Bar */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1.5 text-neutral-400 hover:text-foreground">
              &larr; Feed
            </Button>
          </Link>

          <div className="h-4 w-px bg-neutral-800" />

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" /> Pair Radar
            </h1>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          {Object.values(RADAR_MODES).map((mode) => {
            const Icon = mode.icon;
            const isSelected = activeMode === mode.id;
            return (
              <Button
                key={mode.id}
                size="sm"
                variant={isSelected ? 'secondary' : 'ghost'}
                onClick={() => {
                  if (activeMode !== mode.id) {
                    setActiveMode(mode.id);
                    setWorkspaceCode(mode.defaultTemplate);
                  }
                }}
                className={`text-xs h-8 gap-1.5 ${isSelected ? 'font-bold border border-neutral-700' : 'text-muted-foreground'}`}
              >
                <Icon className={`w-3.5 h-3.5 ${mode.colorClass}`} />
                <span className="hidden sm:inline">{mode.badge}</span>
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSkip}
            className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold h-8 gap-1.5"
          >
            <SkipForward className="w-3.5 h-3.5" /> Next Match
          </Button>
        </div>
      </header>

      {/* Main Dual Pane: Left Code Workspace, Right Video Radar */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Pane (7 cols): Collaborative Workspace */}
        <div className="lg:col-span-7 flex flex-col border-r border-neutral-800 bg-neutral-950 overflow-hidden">
          <div className="h-10 border-b border-neutral-800 bg-neutral-900/40 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-neutral-300">
                Shared Scratchpad
              </span>
              <span className="text-[10px] text-muted-foreground">
                (Real-time data synchronization)
              </span>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyCode}
              className="h-7 text-[11px] gap-1 text-neutral-400 hover:text-foreground"
            >
              {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedCode ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
            <textarea
              value={workspaceCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="w-full h-full min-h-[300px] bg-transparent resize-none outline-none font-mono text-xs leading-relaxed text-neutral-200 placeholder:text-neutral-600"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right Pane (5 cols): Video Feeds & Partner Profile */}
        <div className="lg:col-span-5 flex flex-col bg-neutral-900/30 overflow-hidden">
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
            {/* Remote Video / Partner Box */}
            <div className="relative aspect-video rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center shadow-md">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${connected ? 'block' : 'hidden'}`}
              />

              {!connected && (
                <div className="text-center p-6 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 animate-pulse">
                    <Zap className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-neutral-200">
                    Scanning for {RADAR_MODES[activeMode]?.badge || 'Builder'}...
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Searching queue ({elapsedSeconds}s). You will be paired automatically.
                  </p>
                </div>
              )}
            </div>

            {/* Partner Profile Card (When connected) */}
            {connected && partnerProfile && (
              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar user={partnerProfile} className="w-9 h-9 border border-neutral-800" />
                    <div>
                      <h3 className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
                        {partnerProfile.name || partnerProfile.user_name}
                      </h3>
                      <p className="text-[10px] text-muted-foreground">@{partnerProfile.user_name}</p>
                    </div>
                  </div>

                  <Link href={`/dashboard/user/${partnerProfile.user_name}`} target="_blank">
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1">
                      <ExternalLink className="w-3 h-3" /> Profile
                    </Button>
                  </Link>
                </div>

                {partnerProfile.bio && (
                  <p className="text-xs text-neutral-300 line-clamp-2 italic">
                    &ldquo;{partnerProfile.bio}&rdquo;
                  </p>
                )}

                {partnerProfile.skills && partnerProfile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {partnerProfile.skills.map((skill: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-[10px]">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Local Camera */}
            <div className="relative aspect-video rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center shadow-md">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoDisabled ? 'hidden' : 'block'}`}
              />

              {isVideoDisabled && (
                <div className="text-center space-y-1">
                  <UserAvatar user={currentUser} className="w-12 h-12 mx-auto" />
                  <p className="text-xs text-muted-foreground">Camera Off</p>
                </div>
              )}

              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-white">
                You (@{currentUser.user_name})
              </div>
            </div>
          </div>

          {/* Bottom Floating Controls */}
          <div className="h-16 border-t border-neutral-800 bg-neutral-950/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isAudioMuted ? 'destructive' : 'secondary'}
                onClick={toggleAudio}
                className="h-9 w-9 p-0 rounded-full"
              >
                {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant={isVideoDisabled ? 'destructive' : 'secondary'}
                onClick={toggleVideo}
                className="h-9 w-9 p-0 rounded-full"
              >
                {isVideoDisabled ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant={isScreenSharing ? 'default' : 'secondary'}
                onClick={toggleScreenShare}
                className={`h-9 w-9 p-0 rounded-full ${isScreenSharing ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
              >
                <ScreenShare className="w-4 h-4" />
              </Button>
            </div>

            <Button
              size="sm"
              onClick={handleSkip}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-4 rounded-full gap-1.5"
            >
              <SkipForward className="w-4 h-4" /> Next Developer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
