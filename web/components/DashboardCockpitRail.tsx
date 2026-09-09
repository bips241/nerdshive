'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Video,
  Trophy,
  Users,
  Rocket,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Hash,
  Send,
  Code2,
  ShieldCheck,
  Zap,
  ExternalLink,
  Film,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useFeed, CockpitTab } from './FeedProvider';
import UserAvatar from './UserAvatar';
import { getUserServers, getChannelMessages, sendChannelMessageAction } from '@/lib/chat-actions';
import { getPeopleYouMightKnowAction } from '@/lib/radar-actions';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface DashboardCockpitRailProps {
  currentUser: {
    _id: string;
    user_name: string;
    name?: string;
    image?: string;
    avatar?: string;
  };
}

interface HackathonSnippet {
  title: string;
  slug: string;
  daysLeft: number;
  tag: string;
  organizer: string;
}

const UPCOMING_HACKATHONS: HackathonSnippet[] = [
  {
    title: 'HackMIT 2026',
    slug: 'hackmit-2026',
    daysLeft: 4,
    tag: 'Web3 & AI',
    organizer: 'MIT Tech Club',
  },
  {
    title: 'ETHGlobal DevConnect',
    slug: 'ethglobal-devconnect',
    daysLeft: 7,
    tag: 'Smart Contracts',
    organizer: 'ETHGlobal',
  },
  {
    title: 'AI Agents World Cup',
    slug: 'ai-agents-world-cup',
    daysLeft: 14,
    tag: 'Autonomous AI',
    organizer: 'OpenSource Labs',
  },
];

export default function DashboardCockpitRail({ currentUser }: DashboardCockpitRailProps) {
  const { cockpitTab, setCockpitTab } = useFeed();

  // Chat State
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<any | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [showCodeBox, setShowCodeBox] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('typescript');
  const [suggestedDevs, setSuggestedDevs] = useState<any[]>([]);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Load user servers for Discord Chat
  useEffect(() => {
    let isMounted = true;
    async function loadServers() {
      try {
        const userServers = await getUserServers();
        if (isMounted && userServers && userServers.length > 0) {
          setServers(userServers);
          setSelectedServer(userServers[0]);
          const firstTextChannel = userServers[0].channels?.find((c: any) => c.type === 'text') || userServers[0].channels?.[0];
          setSelectedChannel(firstTextChannel || null);
        }
      } catch (err) {
        console.error('Error loading servers for cockpit:', err);
      }
    }
    loadServers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load People You Might Know (PYMK) for Cockpit Rail
  useEffect(() => {
    let isMounted = true;
    async function loadPYMK() {
      try {
        const res = await getPeopleYouMightKnowAction(4);
        if (isMounted && res.success && res.developers) {
          setSuggestedDevs(res.developers);
        }
      } catch (err) {
        console.error('Failed to load PYMK in cockpit rail:', err);
      }
    }
    loadPYMK();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load channel messages when channel changes
  useEffect(() => {
    let isMounted = true;
    async function loadMessages() {
      if (!selectedChannel?._id) return;
      try {
        const msgs = await getChannelMessages(selectedChannel._id);
        if (isMounted) {
          setChatMessages(msgs || []);
          setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
          }, 100);
        }
      } catch (err) {
        console.error('Error loading channel messages:', err);
      }
    }
    loadMessages();
    return () => {
      isMounted = false;
    };
  }, [selectedChannel?._id]);

  // Realtime Socket connection for Discord Chat
  useEffect(() => {
    const signalingUrl =
      process.env.NEXT_PUBLIC_SIGNALING_URL ||
      (typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:10000'
        : 'https://nerdshive.online');

    const socket = io(signalingUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (selectedChannel?._id) {
        socket.emit('join_channel', { channelId: selectedChannel._id });
      }
    });

    socket.on('new_channel_message', (incoming: any) => {
      if (incoming.channelId === selectedChannel?._id) {
        setChatMessages((prev) => {
          if (prev.some((m) => m._id === incoming._id)) return prev;
          return [...prev, incoming];
        });
        setTimeout(() => {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedChannel?._id]);

  // Send Discord Chat Message
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() && !codeSnippet.trim()) return;
    if (!selectedChannel?._id || !selectedServer?._id) {
      toast.error('No channel selected');
      return;
    }

    const payload = {
      channelId: selectedChannel._id,
      serverId: selectedServer._id,
      message: chatInput.trim(),
      codeSnippet: codeSnippet.trim() ? { language: codeLanguage, code: codeSnippet.trim() } : undefined,
    };

    setChatInput('');
    setCodeSnippet('');
    setShowCodeBox(false);

    // Optimistic message
    const tempId = 'temp-' + Date.now();
    const optimisticMsg = {
      _id: tempId,
      message: payload.message,
      codeSnippet: payload.codeSnippet,
      channelId: payload.channelId,
      senderId: {
        _id: currentUser._id,
        user_name: currentUser.user_name,
        image: currentUser.image,
      },
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const res = await sendChannelMessageAction(payload);
      if (res?.success && res.message) {
        socketRef.current?.emit('channel_message', res.message);
        setChatMessages((prev) => prev.map((m) => (m._id === tempId ? res.message : m)));
      }
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  return (
    <aside className="w-full h-full flex flex-col rounded-2xl border border-border/70 bg-card/80 backdrop-blur-md overflow-hidden shadow-xs">
      {/* 1. Header Segmented Switcher */}
      <div className="p-2 border-b border-border/60 bg-secondary/30 shrink-0">
        <div className="grid grid-cols-2 gap-1 bg-background/80 p-1 rounded-xl border border-border/50">
          <button
            onClick={() => setCockpitTab('pulse')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              cockpitTab === 'pulse'
                ? 'bg-secondary text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Pulse</span>
          </button>

          <button
            onClick={() => setCockpitTab('chat')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              cockpitTab === 'chat'
                ? 'bg-secondary text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>Squad Chat</span>
          </button>
        </div>
      </div>

      {/* 2. Dynamic Content Panes */}

      {/* TAB 1: PULSE OVERVIEW */}
      {cockpitTab === 'pulse' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* Pair Radar Live Card */}
          <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 via-card to-card p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Video className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Pair Radar</h3>
                  <p className="text-[10px] text-muted-foreground">1-on-1 Video & Code Collab</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Pair with another active engineer for real-time video, audio, and code debugging.
            </p>
            <Link href="/dashboard/radar" className="block">
              <Button
                size="sm"
                className="w-full h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5"
              >
                Launch Radar
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* Verified Hackathons */}
          <div className="rounded-xl border border-border/70 bg-secondary/15 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Target Hackathons
                </h4>
              </div>
              <Link
                href="/dashboard/explore"
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
              >
                View all
                <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>

            <div className="space-y-1.5">
              {UPCOMING_HACKATHONS.map((hackathon) => (
                <Link
                  key={hackathon.slug}
                  href={`/dashboard/hackathons/${hackathon.slug}`}
                  className="group block p-2 rounded-lg border border-border/40 hover:border-amber-500/30 bg-secondary/30 hover:bg-secondary/60 transition-all"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold text-foreground group-hover:text-amber-400 transition-colors truncate">
                      {hackathon.title}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                      {hackathon.daysLeft}d left
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="truncate">{hackathon.tag}</span>
                    <span className="truncate opacity-75">{hackathon.organizer}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* People You Might Know (PYMK) */}
          {suggestedDevs.length > 0 && (
            <div className="rounded-xl border border-border/70 bg-secondary/15 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    People You Might Know
                  </h4>
                </div>
                <Link
                  href="/dashboard/search"
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                >
                  Explore
                  <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              </div>

              <div className="space-y-2">
                {suggestedDevs.slice(0, 3).map((dev) => (
                  <div
                    key={dev._id}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <Link
                      href={`/dashboard/user/${dev.user_name}`}
                      className="flex items-center gap-2 min-w-0 flex-1"
                    >
                      <UserAvatar user={dev} className="w-7 h-7 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate hover:underline">
                          {dev.name || dev.user_name}
                        </p>
                        <p className="text-[10px] text-emerald-400 truncate">
                          {dev.reason || (dev.college || dev.organization || 'Developer')}
                        </p>
                      </div>
                    </Link>
                    <Link href={`/dashboard/user/${dev.user_name}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px] text-cyan-400 hover:text-cyan-300"
                      >
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Developer Action Hub */}
          <div className="rounded-xl border border-border/70 bg-secondary/15 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Developer Action Hub
              </h4>
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Hub
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <Link
                href="/dashboard/create?type=hackathon_crew"
                className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-amber-500/30 transition-all group"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <div className="p-1 rounded bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-foreground/90 font-semibold text-xs block truncate">
                      Recruit Squad Teammates
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Fill skill gaps with auto-provisioned servers
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
              </Link>

              <Link
                href="/dashboard/create?type=ship_log"
                className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-purple-500/30 transition-all group"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <div className="p-1 rounded bg-purple-500/10 text-purple-400 shrink-0 mt-0.5">
                    <Rocket className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-foreground/90 font-semibold text-xs block truncate">
                      Launchpad & Ship Demo
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Get alpha testers & feedback on your MVP
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
              </Link>

              <Link
                href="/dashboard/create?type=media"
                className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/60 border border-transparent hover:border-neutral-500/30 transition-all group"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <div className="p-1 rounded bg-neutral-500/10 text-neutral-400 shrink-0 mt-0.5">
                    <Film className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-foreground/90 font-semibold text-xs block truncate">
                      Demo Reel & Visual Media
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Upload video reels, recordings & demos
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DISCORD & SQUAD CHAT */}
      {cockpitTab === 'chat' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Server & Channel Selector Bar */}
          <div className="px-3 py-2 border-b border-border/50 bg-secondary/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-foreground truncate">
                {selectedServer?.name || "Nerd's Lounge"}
              </span>
              <span className="text-muted-foreground text-xs">/</span>
              <div className="flex items-center gap-1 text-xs text-primary font-medium">
                <Hash className="w-3 h-3 text-muted-foreground" />
                <span>{selectedChannel?.name || 'general'}</span>
              </div>
            </div>

            <Link
              href="/dashboard/messages"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Expand to Fullscreen Chat"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Channel Pills (if server has multiple text channels) */}
          {selectedServer?.channels && selectedServer.channels.length > 1 && (
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/40 overflow-x-auto no-scrollbar bg-background/50 shrink-0">
              {selectedServer.channels
                .filter((c: any) => c.type === 'text')
                .map((ch: any) => (
                  <button
                    key={ch._id}
                    onClick={() => setSelectedChannel(ch)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 transition-all ${
                      selectedChannel?._id === ch._id
                        ? 'bg-secondary text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Hash className="w-2.5 h-2.5 text-muted-foreground" />
                    <span>{ch.name}</span>
                  </button>
                ))}
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs no-scrollbar">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-1 text-muted-foreground">
                <MessageSquare className="w-6 h-6 opacity-40 mb-1" />
                <p className="font-semibold text-foreground text-xs">No messages yet</p>
                <p className="text-[11px]">Start the conversation in #{selectedChannel?.name || 'general'}</p>
              </div>
            ) : (
              chatMessages.map((msg, i) => {
                const senderName = msg.senderId?.user_name || 'Developer';
                const isMe = msg.senderId?._id === currentUser._id;
                return (
                  <div key={msg._id || i} className="flex items-start gap-2 group">
                    <UserAvatar
                      user={{
                        user_name: senderName,
                        image: msg.senderId?.image,
                        name: msg.senderId?.name,
                      }}
                      className="h-6 w-6 shrink-0 mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`font-semibold text-[11px] ${isMe ? 'text-primary' : 'text-foreground'}`}>
                          {senderName}
                        </span>
                        <span suppressHydrationWarning className="text-[9px] text-muted-foreground/60">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/90 break-words leading-relaxed">
                        {msg.message}
                      </p>
                      {msg.codeSnippet?.code && (
                        <div className="mt-1 p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-emerald-400 overflow-x-auto">
                          <pre>{msg.codeSnippet.code}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Code Snippet Modal Inline */}
          {showCodeBox && (
            <div className="p-2 border-t border-border/60 bg-neutral-950 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Code2 className="w-3 h-3 text-emerald-400" /> Attach Code Snippet
                </span>
                <button
                  onClick={() => setShowCodeBox(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="Paste code snippet here..."
                rows={3}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-xs font-mono text-emerald-400 focus:outline-none resize-none"
              />
            </div>
          )}

          {/* Chat Composer */}
          <form
            onSubmit={handleSendChatMessage}
            className="p-2.5 border-t border-border/60 bg-secondary/30 shrink-0 flex items-center gap-1.5"
          >
            <button
              type="button"
              onClick={() => setShowCodeBox(!showCodeBox)}
              className={`p-1.5 rounded-lg border transition-colors ${
                showCodeBox
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-secondary text-muted-foreground border-border/50 hover:text-foreground'
              }`}
              title="Attach Code Snippet"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Message #${selectedChannel?.name || 'general'}...`}
              className="h-8 text-xs bg-background/80 flex-1 border-border/60"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!chatInput.trim() && !codeSnippet.trim()}
              className="h-8 w-8 p-0 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      )}
    </aside>
  );
}
