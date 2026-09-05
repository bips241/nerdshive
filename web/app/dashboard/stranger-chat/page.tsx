'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Peer, { DataConnection } from 'peerjs';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  UserPlus,
  SkipForward,
  RefreshCw,
  Code2,
  Copy,
  Check,
  Share2,
  ArrowLeft,
  Sparkles,
  Terminal,
  Layers,
  Users,
  Briefcase,
  ExternalLink,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import Link from 'next/link';

interface IntentConfig {
  id: string;
  label: string;
  shortLabel: string;
  subtitle: string;
  icon: any;
  colorClass: string;
  badgeClass: string;
  buttonClass: string;
  workspaceTitle: string;
  workspaceDesc: string;
  defaultContent: string;
  hasLanguagePicker?: boolean;
}

const INTENT_CONFIGS: Record<string, IntentConfig> = {
  pair_debug: {
    id: 'pair_debug',
    label: '🐛 Pair Debug & Code Review',
    shortLabel: 'Pair Debug',
    subtitle: 'Step through bugs, inspect error traces, and refactor live with an engineer.',
    icon: Terminal,
    colorClass: 'text-red-400',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30 border border-red-500/40',
    workspaceTitle: 'Live Code Scratchpad',
    workspaceDesc: 'Paste reproducible bugs or write algorithms together.',
    hasLanguagePicker: true,
    defaultContent: `// TypeScript / JavaScript Pair-Programming Scratchpad
// Paste your bug snippet or reproduction logic here:

interface TaskRecord {
  id: string;
  status: 'queued' | 'active' | 'resolved';
  retries: number;
}

function processTask(task: TaskRecord): boolean {
  console.log('Inspecting task payload:', task);
  // Place breakpoint or reproduction code below:
  return task.status === 'active';
}
`,
  },
  project_teammate: {
    id: 'project_teammate',
    label: '⚡ Hackathon & Project Crew',
    shortLabel: 'Hackathon Crew',
    subtitle: 'Find frontend, backend, or AI builders for upcoming hackathons & open source.',
    icon: Users,
    colorClass: 'text-purple-400',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    buttonClass: 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/30 border border-purple-500/40',
    workspaceTitle: 'Hackathon & Crew Pitch Pad',
    workspaceDesc: 'Outline your project concept, target hackathon, and open teammate roles.',
    defaultContent: `# 🚀 Hackathon Project Pitch Pad

## Project Concept & Value Prop:
- Problem: 
- Proposed Solution: 

## Target Hackathon / Bounty:
- Hackathon: 
- Track: 

## Tech Stack & Architecture:
- Frontend: Next.js / Tailwind CSS / Radix
- Backend & Realtime: Node.js / Socket.IO / WebRTC
- Database / Cloud: MongoDB / Redis / Docker

## Open Roles Needed:
- [ ] Frontend UI Engineer (React / Tailwind)
- [ ] Backend / Smart Contract Specialist
- [ ] Product / Video Pitch Lead
`,
  },
  system_design: {
    id: 'system_design',
    label: '📐 System Design & Mock Interview',
    shortLabel: 'System Design',
    subtitle: 'Architect scalable distributed systems, caching tiers, and practice mock screens.',
    icon: Layers,
    colorClass: 'text-blue-400',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/30 border border-blue-500/40',
    workspaceTitle: 'System Design Whiteboard Notes',
    workspaceDesc: 'Map components, API boundaries, bottlenecks, and database schemas.',
    defaultContent: `# 📐 System Design Blueprint

## 1. Functional & Scale Requirements:
- Read / Write Ratio: 
- DAU / QPS Targets: 10M DAU (~120k QPS read, 15k QPS write)
- Latency SLA: p99 < 80ms globally

## 2. High-Level Data Flow:
[Clients / Edge]
      │
[Cloudflare CDN & GeoDNS]
      │
[API Gateway / Rate Limiter]
      │
[Stateless Application Services (K8s)]
   ├── [Redis Cache-Aside Cluster]
   └── [Primary DB (Mongo / Postgres) + Read Replicas]

## 3. Failure Scenarios & Trade-offs:
- Hot key thundering herd -> Singleflight mutex & stale-while-revalidate
- Network partition -> Quorum writes (W=2, R=2)
`,
  },
  hiring: {
    id: 'hiring',
    label: '💼 Hiring & Co-Founders',
    shortLabel: 'Hiring & Founders',
    subtitle: 'Connect with technical co-founders, early engineering hires, or seed talent.',
    icon: Briefcase,
    colorClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/30 border border-emerald-500/40',
    workspaceTitle: 'Co-Founder & Talent Dossier',
    workspaceDesc: 'Present your startup thesis, tech requirements, and equity/compensation.',
    defaultContent: `# 💼 Co-Founder & Opportunity Brief

## 1. The Venture:
- Startup Name / Concept: 
- Current Stage: (Pre-seed / MVP Live / Bootstrapped / Funded)
- Verified Traction: 

## 2. Ideal Partner Profile:
- Role: (Technical Co-Founder / Founding Fullstack Engineer)
- Must-Have Skills: (Distributed Systems, TypeScript, WebRTC, Go)
- Time Commitment: (Full-Time / Part-Time transition)

## 3. Compensation & Equity:
- Equity Split: 
- Cash / Runway: 
- Location / Remote: Fully Remote
`,
  },
};

const CODE_TEMPLATES: Record<string, string> = {
  typescript: `// TypeScript Pair-Programming
function solveProblem(input: string[]): string {
  return input.join(', ');
}
`,
  javascript: `// JavaScript Live Scratchpad
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const comp = target - nums[i];
    if (map.has(comp)) return [map.get(comp), i];
    map.set(nums[i], i);
  }
  return [];
}
`,
  python: `# Python Pair-Programming
def solve_problem(items: list[str]) -> str:
    return ", ".join(items)
`,
  rust: `// Rust Scratchpad
fn main() {
    let crew = vec!["Rustacean", "FullStack", "Gopher"];
    println!("Pair hacking on NerdShive: {:?}", crew);
}
`,
  go: `// Go Scratchpad
package main

import "fmt"

func main() {
    fmt.Println("Live Pair Debugging on NerdShive")
}
`,
};

export default function StrangerVideoChatPage() {
  const searchParams = useSearchParams();

  // Active intent & room state
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [targetRoom, setTargetRoom] = useState<string | null>(null);
  const [targetHackathon, setTargetHackathon] = useState<string | null>(null);

  // Connection & media status
  const [connected, setConnected] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isDirectMatch, setIsDirectMatch] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Media toggles
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Post match & invite
  const [lastPartnerPeerId, setLastPartnerPeerId] = useState<string | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [myDirectRoomId, setMyDirectRoomId] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Interactive Workspace State
  const [showWorkspace, setShowWorkspace] = useState(true);
  const [workspaceLang, setWorkspaceLang] = useState('typescript');
  const [workspaceContent, setWorkspaceContent] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const activeCallRef = useRef<any>(null);
  const dataConnectionRef = useRef<DataConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const currentPeerIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ICE configuration
  const getIceServers = useCallback(() => {
    const username = process.env.NEXT_PUBLIC_METERED_TURN_USERNAME;
    const credential = process.env.NEXT_PUBLIC_METERED_TURN_CREDENTIAL;
    const stunUrl = process.env.NEXT_PUBLIC_METERED_STUN_URL || 'stun:stun.relay.metered.ca:80';
    const turnUrl = process.env.NEXT_PUBLIC_METERED_TURN_URL || 'turn:standard.relay.metered.ca:80';
    const turnTcpUrl = process.env.NEXT_PUBLIC_METERED_TURN_TCP_URL || 'turn:standard.relay.metered.ca:80?transport=tcp';
    const turn443Url = process.env.NEXT_PUBLIC_METERED_TURN_443_URL || 'turn:standard.relay.metered.ca:443';
    const turns443TcpUrl = process.env.NEXT_PUBLIC_METERED_TURNS_443_TCP_URL || 'turns:standard.relay.metered.ca:443?transport=tcp';

    if (!username || !credential) {
      return [{ urls: stunUrl }];
    }

    return [
      { urls: stunUrl },
      { urls: turnUrl, username, credential },
      { urls: turnTcpUrl, username, credential },
      { urls: turn443Url, username, credential },
      { urls: turns443TcpUrl, username, credential },
    ];
  }, []);

  // Cleanup helper
  const teardownAll = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.emit('leave_queue');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (activeCallRef.current) {
      activeCallRef.current.close();
      activeCallRef.current = null;
    }

    if (dataConnectionRef.current) {
      dataConnectionRef.current.close();
      dataConnectionRef.current = null;
    }

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setConnected(false);
    setSearching(false);
    setElapsedSeconds(0);
  }, []);

  // Initialize query parameters on load
  useEffect(() => {
    const initialMode = searchParams?.get('mode');
    const initialRoom = searchParams?.get('room');
    const initialSnippet = searchParams?.get('snippet');
    const initialTitle = searchParams?.get('title');
    const initialHackathon = searchParams?.get('hackathon');

    if (initialRoom) {
      setTargetRoom(initialRoom);
    }

    if (initialHackathon) {
      setTargetHackathon(initialHackathon);
    }

    if (initialMode && INTENT_CONFIGS[initialMode]) {
      setSelectedIntent(initialMode);
      if (initialSnippet) {
        setWorkspaceContent(`// ${initialTitle || 'Debugging Session'}\n${initialSnippet}`);
      } else if (initialHackathon) {
        setWorkspaceContent(
          `# ⚡ Speed Match Dossier: ${initialHackathon.toUpperCase()}\n\n## 🎯 Target Hackathon:\n${initialHackathon}\n\n## 🛠️ My Core Tech Stack:\n- Frontend: React / Next.js / Tailwind\n- Backend: Node.js / Go / Python\n- AI / ML / Web3: \n\n## 🤝 Roles Urgently Needed for Squad:\n- [ ] UI/UX Designer\n- [ ] Backend Systems Specialist\n- [ ] Full-Stack Partner\n`
        );
      } else {
        setWorkspaceContent(INTENT_CONFIGS[initialMode].defaultContent);
      }
    }

    // Generate random personal direct room id for quick invite links
    const directId = `nerd-${Math.random().toString(36).slice(2, 9)}`;
    setMyDirectRoomId(directId);

    return () => {
      teardownAll();
    };
  }, [searchParams, teardownAll]);

  // Connect & join queue whenever selectedIntent or targetRoom changes
  useEffect(() => {
    if (!selectedIntent) return;

    let isSubscribed = true;
    setSearching(true);
    setConnected(false);
    setElapsedSeconds(0);

    // Start waiting elapsed timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    // Initialize Socket
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'https://nerdshive-socket-server.onrender.com';
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    socketRef.current = socket;

    // Generate Peer ID
    const peerId = `dev_${Math.random().toString(36).slice(2, 10)}`;
    currentPeerIdRef.current = peerId;

    const peer = new Peer(peerId, {
      host: process.env.NEXT_PUBLIC_PEER_SERVER_HOST || 'peer-server-zr5n.onrender.com',
      port: Number(process.env.NEXT_PUBLIC_PEER_SERVER_PORT || 443),
      path: process.env.NEXT_PUBLIC_PEER_SERVER_PATH || '/peerjs',
      secure: true,
      config: {
        iceServers: getIceServers(),
      },
    });
    peerRef.current = peer;

    // Setup DataConnection handling for scratchpad sync
    const setupDataConnection = (conn: DataConnection) => {
      dataConnectionRef.current = conn;
      conn.on('data', (data: any) => {
        if (data && typeof data === 'object' && data.type === 'WORKSPACE_SYNC') {
          setWorkspaceContent(data.content);
        }
      });
    };

    peer.on('connection', (conn) => {
      setupDataConnection(conn);
    });

    const bindCallEvents = (call: any) => {
      activeCallRef.current = call;

      call.on('stream', (remoteStream: MediaStream) => {
        if (!isSubscribed) return;
        setConnected(true);
        setSearching(false);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      call.on('close', () => {
        if (!isSubscribed) return;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        activeCallRef.current = null;
        setConnected(false);
        setSearching(true);
        setShowConnectDialog(true);
      });

      call.on('error', (err: any) => {
        console.error('Peer call error:', err);
      });
    };

    const emitJoin = (pId: string) => {
      if (!socket.connected) return;
      if (targetRoom) {
        socket.emit('direct_room:join', { roomId: targetRoom, peerId: pId, intent: selectedIntent });
      } else {
        socket.emit('join_queue', { intent: selectedIntent, peerId: pId });
      }
    };

    socket.on('connect', () => {
      if (currentPeerIdRef.current) {
        emitJoin(currentPeerIdRef.current);
      }
    });

    socket.on('queued', ({ intent, queueSize }) => {
      if (!isSubscribed) return;
      setSearching(true);
      setConnected(false);
      console.log(`Successfully queued in: ${intent} (queue size: ${queueSize})`);
    });

    socket.on('match_found', ({ peerId: remotePeerId, isInitiator, isDirect }) => {
      if (!isSubscribed) return;
      console.log(`Matched with peer: ${remotePeerId}, isInitiator: ${isInitiator}`);
      setLastPartnerPeerId(remotePeerId);
      setShowConnectDialog(false);
      setIsDirectMatch(!!isDirect);

      // Establish data channel connection
      if (peerRef.current) {
        const conn = peerRef.current.connect(remotePeerId);
        setupDataConnection(conn);
      }

      // Initiate WebRTC Media Call
      if (isInitiator && localStreamRef.current && peerRef.current) {
        const call = peerRef.current.call(remotePeerId, localStreamRef.current);
        bindCallEvents(call);
      } else if (!isInitiator) {
        // Fallback initiator trigger in case initiator drops
        setTimeout(() => {
          if (!activeCallRef.current && localStreamRef.current && peerRef.current) {
            const fallbackCall = peerRef.current.call(remotePeerId, localStreamRef.current);
            bindCallEvents(fallbackCall);
          }
        }, 1600);
      }
    });

    socket.on('left', () => {
      if (!isSubscribed) return;
      if (activeCallRef.current) {
        activeCallRef.current.close();
        activeCallRef.current = null;
      }
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setConnected(false);
      setSearching(true);
      setShowConnectDialog(true);
      toast.info('Your pair partner left the room.');

      if (currentPeerIdRef.current) {
        emitJoin(currentPeerIdRef.current);
      }
    });

    socket.on('queue_error', (payload) => {
      console.error('Queue error:', payload);
      toast.error(payload?.message || 'Matchmaking error. Retrying...');
    });

    // Request User Camera & Microphone
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!isSubscribed) return;
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        peer.on('open', (openedId) => {
          currentPeerIdRef.current = openedId;
          emitJoin(openedId);
        });

        peer.on('call', (incomingCall) => {
          incomingCall.answer(stream);
          bindCallEvents(incomingCall);
        });

        peer.on('error', (err) => {
          console.error('PeerJS error:', err);
        });
      })
      .catch((err) => {
        console.error('Media stream error:', err);
        toast.error('Could not access camera or microphone.');
        setSearching(false);
      });

    return () => {
      isSubscribed = false;
      teardownAll();
    };
  }, [selectedIntent, targetRoom, getIceServers, teardownAll]);

  // Handle Intent Switching
  const handleSelectIntent = (intentId: string) => {
    teardownAll();
    setSelectedIntent(intentId);
    setTargetRoom(null);
    setWorkspaceContent(INTENT_CONFIGS[intentId].defaultContent);

    // Synchronize URL cleanly
    const url = new URL(window.location.href);
    url.searchParams.set('mode', intentId);
    url.searchParams.delete('room');
    window.history.replaceState(null, '', url.toString());
  };

  // Leave Queue / Back to 4-button selector
  const handleLeaveQueue = () => {
    teardownAll();
    setSelectedIntent(null);
    setTargetRoom(null);

    // Clean URL
    const url = new URL(window.location.href);
    url.searchParams.delete('mode');
    url.searchParams.delete('room');
    window.history.replaceState(null, '', url.pathname);
  };

  // Skip / Next Match in same intent
  const handleNextMatch = () => {
    if (!socketRef.current || !selectedIntent) return;

    socketRef.current.emit('skip');
    if (activeCallRef.current) {
      activeCallRef.current.close();
      activeCallRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setConnected(false);
    setSearching(true);
    setElapsedSeconds(0);

    if (currentPeerIdRef.current) {
      socketRef.current.emit('join_queue', { intent: selectedIntent, peerId: currentPeerIdRef.current });
    }
    toast.info('Searching for next developer in queue...');
  };

  // Audio mute toggle
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  // Video enable/disable toggle
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  // Screen sharing toggle
  const toggleScreenShare = async () => {
    if (!connected || !activeCallRef.current) {
      toast.info('Pair with a developer first before sharing screen.');
      return;
    }

    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        const cameraTrack = localStreamRef.current.getVideoTracks()[0];
        const sender = activeCallRef.current.peerConnection?.getSenders()?.find((s: any) => s.track?.kind === 'video');
        if (sender && cameraTrack) {
          sender.replaceTrack(cameraTrack);
        }
      }
      setIsScreenSharing(false);
      toast.info('Stopped screen sharing');
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = activeCallRef.current.peerConnection?.getSenders()?.find((s: any) => s.track?.kind === 'video');
        if (sender && screenTrack) {
          sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
        toast.success('Sharing screen with pair partner');
      } catch (err) {
        console.error('Screen sharing error:', err);
      }
    }
  };

  // Live workspace update & sync
  const handleWorkspaceChange = (content: string) => {
    setWorkspaceContent(content);
    if (dataConnectionRef.current && dataConnectionRef.current.open) {
      dataConnectionRef.current.send({
        type: 'WORKSPACE_SYNC',
        content,
      });
    }
  };

  // Language selector for code
  const handleLanguageChange = (lang: string) => {
    setWorkspaceLang(lang);
    if (CODE_TEMPLATES[lang]) {
      handleWorkspaceChange(CODE_TEMPLATES[lang]);
    }
  };

  // Copy direct invite link
  const copyDirectInviteLink = () => {
    const roomIdToUse = targetRoom || myDirectRoomId;
    const intentToUse = selectedIntent || 'pair_debug';
    const directUrl = `${window.location.origin}/dashboard/stranger-chat?mode=${intentToUse}&room=${roomIdToUse}`;
    navigator.clipboard.writeText(directUrl);
    setCopiedLink(true);
    toast.success('Direct Invite Link copied! Send it to any developer to pair instantly.');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Copy workspace content
  const copyWorkspaceContent = () => {
    navigator.clipboard.writeText(workspaceContent);
    setCopiedCode(true);
    toast.success('Copied workspace contents to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const activeConfig = selectedIntent ? INTENT_CONFIGS[selectedIntent] : null;

  return (
    <div className="flex flex-col items-center gap-6 p-4 max-w-6xl mx-auto w-full min-h-[calc(100vh-5rem)]">
      {/* 1. INTENT SELECTION SCREEN (When no intent is chosen) */}
      {!selectedIntent ? (
        <div className="flex flex-col items-center text-center space-y-8 py-10 w-full max-w-4xl animate-in fade-in duration-300">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              Live Developer Pairing & Matchmaking
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Stranger Video Chat for Developers
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
              Match randomly with developers, founders, and recruiters based on intent. Code, brainstorm, or pair program live.
            </p>
          </div>

          {/* 4 Intent Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left">
            {Object.values(INTENT_CONFIGS).map((config) => {
              const Icon = config.icon;
              return (
                <button
                  key={config.id}
                  onClick={() => handleSelectIntent(config.id)}
                  className="group relative flex flex-col justify-between p-5 rounded-2xl bg-card border hover:border-primary/50 transition-all duration-200 hover:shadow-xl hover:shadow-primary/5 text-left"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl ${config.badgeClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                        Instant Queue →
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {config.label}
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {config.subtitle}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Workspace: {config.workspaceTitle}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${config.badgeClass}`}>
                      Live
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Direct Invite Generator */}
          <div className="w-full bg-neutral-900/60 border rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Share2 className="h-4 w-4 text-primary" />
                <span>Want to pair with a specific friend or colleague?</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Generate a private direct invite link to skip the public matchmaking pool.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs font-semibold w-full sm:w-auto"
                onClick={copyDirectInviteLink}
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedLink ? 'Link Copied!' : 'Copy Direct Room Link'}
              </Button>
              <Link href="/dashboard/messages">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs font-semibold">
                  Squad Messages <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* 2. ACTIVE QUEUE & IN-CALL WORKSPACE SCREEN */
        <div className="w-full flex flex-col items-center space-y-4 animate-in fade-in duration-300">
          {/* Header Status Bar */}
          <div className="flex flex-wrap items-center justify-between w-full bg-card border rounded-2xl px-4 py-3 gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                onClick={handleLeaveQueue}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Leave Queue
              </Button>

              <div className="h-4 w-[1px] bg-border" />

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Active Intent:</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${activeConfig?.badgeClass}`}>
                  {activeConfig?.label}
                </span>
                {targetHackathon && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-amber-500" />
                    {targetHackathon.toUpperCase()} Radar
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Live Connection Status */}
              <div className="flex items-center gap-2 text-xs bg-neutral-950 px-3 py-1.5 rounded-full border">
                <span
                  className={`h-2 w-2 rounded-full ${
                    connected ? 'bg-emerald-500 animate-pulse' : searching ? 'bg-amber-500 animate-ping' : 'bg-neutral-500'
                  }`}
                />
                <span className="font-medium text-foreground">
                  {connected
                    ? isDirectMatch
                      ? 'Connected (Direct Room)'
                      : 'Connected with Developer'
                    : `Searching (${Math.floor(elapsedSeconds / 60)}:${(elapsedSeconds % 60)
                        .toString()
                        .padStart(2, '0')})`}
                </span>
              </div>

              {/* Direct Invite Link Button */}
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold"
                onClick={copyDirectInviteLink}
                title="Share this link with a teammate to pair immediately"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Invite Teammate'}</span>
              </Button>

              {/* Switch Queue Dropdown */}
              <Select value={selectedIntent} onValueChange={handleSelectIntent}>
                <SelectTrigger className="h-8 text-xs font-semibold w-36">
                  <SelectValue placeholder="Switch Queue" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(INTENT_CONFIGS).map((cfg) => (
                    <SelectItem key={cfg.id} value={cfg.id} className="text-xs">
                      {cfg.shortLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Main Layout: Video Frames + Interactive Context Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-start">
            {/* Video Streams Container */}
            <div className={`${showWorkspace ? 'lg:col-span-6' : 'lg:col-span-12'} flex flex-col gap-4 w-full`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {/* Local Video */}
                <div className="relative aspect-video bg-neutral-950 rounded-2xl overflow-hidden shadow-md border border-border">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/70 text-white text-[11px] font-medium px-2 py-0.5 rounded-lg backdrop-blur-sm">
                    <span>You</span>
                    {isScreenSharing && <span className="text-primary font-bold">(Screen)</span>}
                    {isAudioMuted && <MicOff className="h-3 w-3 text-red-400" />}
                  </div>
                </div>

                {/* Remote Video / Waiting State */}
                <div className="relative aspect-video bg-neutral-950 rounded-2xl overflow-hidden shadow-md border border-border flex items-center justify-center">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!connected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-neutral-950/90 space-y-3">
                      <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">
                          Waiting for {activeConfig?.shortLabel} partner...
                        </p>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          Matching in the <span className="text-foreground font-medium">{activeConfig?.label}</span> queue.
                        </p>
                      </div>

                      <div className="pt-2 flex flex-col items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs font-semibold gap-1.5"
                          onClick={copyDirectInviteLink}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy Direct Invite Link
                        </Button>
                        <span className="text-[10px] text-muted-foreground">
                          Share link to connect directly with zero wait time.
                        </span>
                      </div>
                    </div>
                  )}

                  {connected && (
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[11px] font-medium px-2 py-0.5 rounded-lg backdrop-blur-sm">
                      Pair Partner
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Context-Specific Developer Workspace */}
            {showWorkspace && activeConfig && (
              <div className="lg:col-span-6 flex flex-col bg-card border rounded-2xl p-4 shadow-xl space-y-3 w-full animate-in fade-in">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" />
                    <div>
                      <h3 className="text-sm font-bold">{activeConfig.workspaceTitle}</h3>
                      <p className="text-[11px] text-muted-foreground">{activeConfig.workspaceDesc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeConfig.hasLanguagePicker && (
                      <Select value={workspaceLang} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="h-7 w-28 text-xs font-mono">
                          <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="typescript">TypeScript</SelectItem>
                          <SelectItem value="javascript">JavaScript</SelectItem>
                          <SelectItem value="python">Python</SelectItem>
                          <SelectItem value="rust">Rust</SelectItem>
                          <SelectItem value="go">Go</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={copyWorkspaceContent}
                      title="Copy workspace text"
                    >
                      {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                <textarea
                  value={workspaceContent}
                  onChange={(e) => handleWorkspaceChange(e.target.value)}
                  className="w-full h-80 font-mono text-xs p-3 rounded-xl bg-neutral-950 text-emerald-400 border border-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none selection:bg-primary/30"
                  spellCheck={false}
                />

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>💡 Real-time peer synchronized scratchpad</span>
                  <span>Mode: {activeConfig.shortLabel}</span>
                </div>
              </div>
            )}
          </div>

          {/* In-Call Media & Action Bar */}
          <div className="flex items-center gap-3 bg-card border rounded-full px-6 py-3 shadow-xl">
            <Button
              variant={isAudioMuted ? 'destructive' : 'secondary'}
              size="icon"
              className="rounded-full h-10 w-10"
              onClick={toggleAudio}
              title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            <Button
              variant={isVideoDisabled ? 'destructive' : 'secondary'}
              size="icon"
              className="rounded-full h-10 w-10"
              onClick={toggleVideo}
              title={isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoDisabled ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            </Button>

            {connected && (
              <Button
                variant={isScreenSharing ? 'default' : 'secondary'}
                size="icon"
                className="rounded-full h-10 w-10"
                onClick={toggleScreenShare}
                title="Share Screen"
              >
                <ScreenShare className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant={showWorkspace ? 'default' : 'secondary'}
              size="icon"
              className="rounded-full h-10 w-10"
              onClick={() => setShowWorkspace(!showWorkspace)}
              title="Toggle Workspace Pad"
            >
              <Code2 className="h-4 w-4" />
            </Button>

            <div className="h-5 w-[1px] bg-border mx-1" />

            <Button
              variant="destructive"
              className="rounded-full px-5 gap-1.5 font-semibold text-xs h-10"
              onClick={connected ? handleNextMatch : handleLeaveQueue}
            >
              <SkipForward className="h-3.5 w-3.5" />
              {connected ? 'Next Match' : 'Leave Queue'}
            </Button>
          </div>

          {/* Post-Match Teammate Connection Banner */}
          {showConnectDialog && lastPartnerPeerId && (
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 max-w-md w-full flex items-center justify-between shadow-sm animate-in fade-in">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Enjoyed the pair session?</p>
                <p className="text-xs text-muted-foreground">Keep in touch by connecting on NerdShive.</p>
              </div>
              <Button
                size="sm"
                className="gap-1 font-semibold text-xs"
                onClick={() => {
                  toast.success('Teammate connection request sent!');
                  setShowConnectDialog(false);
                }}
              >
                <UserPlus className="h-3.5 w-3.5" /> Connect
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
