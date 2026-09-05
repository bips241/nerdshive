'use client';

import React, { useEffect, useState } from 'react';
import {
  Hash,
  Volume2,
  Video,
  Plus,
  MessageSquare,
  Users,
  Settings,
  Mic,
  MicOff,
  VolumeX,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  PhoneOff,
  Search,
  AtSign,
  Layers,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RealtimeChatView } from './RealtimeChatView';
import { VoiceVideoStage } from './VoiceVideoStage';
import {
  getUserServers,
  createServerAction,
  createChannelAction,
  joinServerByInviteAction,
  getOrCreateDirectChatRoomAction,
} from '@/lib/chat-actions';
import { toast } from 'sonner';
import UserAvatar from '../UserAvatar';

interface DiscordLayoutProps {
  currentUser: {
    _id?: string;
    id?: string;
    user_name?: string;
    name?: string;
    image?: string;
    avatar?: string;
  };
  initialMutualFollows?: any[];
  initialServerId?: string;
}

export const DiscordLayout: React.FC<DiscordLayoutProps> = ({
  currentUser,
  initialMutualFollows = [],
  initialServerId,
}) => {
  const [servers, setServers] = useState<any[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  // Mode: 'dm' vs 'rooms'
  const [activeTab, setActiveTab] = useState<'dm' | 'rooms'>('dm');
  const [directUsers, setDirectUsers] = useState<any[]>(initialMutualFollows);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDirectChat, setActiveDirectChat] = useState<any | null>(null);

  // Active Voice/Video Connection
  const [activeVoiceChannel, setActiveVoiceChannel] = useState<any | null>(null);

  // Modals state
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  // New server form
  const [newServerName, setNewServerName] = useState('');
  const [newServerDesc, setNewServerDesc] = useState('');

  // New channel form
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice' | 'video'>('text');
  const [newChannelTopic, setNewChannelTopic] = useState('');

  // Join server form
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);

  // User media controls state at bottom bar
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // 1. Fetch initial servers and DMs (Zero hardcoded fake rooms)
  useEffect(() => {
    async function loadData() {
      try {
        const userServers = await getUserServers();
        setServers(userServers);

        // Fetch mutual follows for DMs if not provided
        if (directUsers.length === 0) {
          const res = await fetch('/api/chats');
          if (res.ok) {
            const data = await res.json();
            const unique = Array.isArray(data)
              ? Array.from(new Map(data.map((u: any) => [u.id || u._id, u])).values())
              : [];
            setDirectUsers(unique);
          }
        }
      } catch (err) {
        console.error('Error loading servers or chats:', err);
      }
    }

    loadData();
  }, []);

  // 1b. Auto-activate target squad server when linked from squad card
  useEffect(() => {
    if (initialServerId && servers.length > 0) {
      const match = servers.find((s) => s._id === initialServerId);
      if (match) {
        setActiveTab('rooms');
        setActiveDirectChat(null);
        setActiveServerId(match._id);
        const defaultChannel =
          match.channels?.find((c: any) => c.type === 'text') || match.channels?.[0];
        if (defaultChannel) {
          setActiveChannelId(defaultChannel._id);
        }
      }
    }
  }, [initialServerId, servers]);

  const currentServer = servers.find((s) => s._id === activeServerId);
  const currentChannel = currentServer?.channels?.find(
    (c: any) => c._id === activeChannelId
  );

  // Handle Switch to Direct Messages
  const handleSelectDm = async (user: any) => {
    setActiveTab('dm');
    setActiveServerId(null);
    setActiveChannelId(null);

    try {
      const res = await getOrCreateDirectChatRoomAction(user.id || user._id);
      if (res.success && res.room) {
        setActiveDirectChat({
          _id: res.room._id,
          targetUser: user,
        });
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error('Failed to open direct message');
    }
  };

  // Handle Select Channel in Room
  const handleSelectChannel = (server: any, channel: any) => {
    setActiveTab('rooms');
    setActiveDirectChat(null);
    setActiveServerId(server._id);
    setActiveChannelId(channel._id);

    if (channel.type === 'voice' || channel.type === 'video') {
      setActiveVoiceChannel(channel);
    }
  };

  // Create Server / Squad Room
  const handleCreateServer = async () => {
    if (!newServerName.trim()) return;

    try {
      const res = await createServerAction({
        name: newServerName.trim(),
        description: newServerDesc.trim(),
      });

      if (res.success && res.server) {
        setServers((prev) => [res.server, ...prev]);
        setActiveServerId(res.server._id);
        setActiveChannelId(res.server.channels?.[0]?._id);
        setActiveTab('rooms');
        setActiveDirectChat(null);
        setServerModalOpen(false);
        setNewServerName('');
        setNewServerDesc('');
        toast.success(`Squad room "${res.server.name}" created!`);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error('Failed to create squad room');
    }
  };

  // Create Channel inside Server
  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !activeServerId) return;

    try {
      const res = await createChannelAction({
        serverId: activeServerId,
        name: newChannelName.trim(),
        type: newChannelType,
        topic: newChannelTopic.trim(),
      });

      if (res.success && res.channel) {
        setServers((prev) =>
          prev.map((s) => {
            if (s._id === activeServerId) {
              return {
                ...s,
                channels: [...(s.channels || []), res.channel],
              };
            }
            return s;
          })
        );
        setActiveChannelId(res.channel._id);
        if (res.channel.type === 'voice' || res.channel.type === 'video') {
          setActiveVoiceChannel(res.channel);
        }
        setChannelModalOpen(false);
        setNewChannelName('');
        setNewChannelTopic('');
        toast.success(`Channel #${res.channel.name} created!`);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error('Failed to create channel');
    }
  };

  // Join Server by Invite Code
  const handleJoinServer = async () => {
    if (!inviteCodeInput.trim()) return;

    try {
      const res = await joinServerByInviteAction(inviteCodeInput.trim());
      if (res.success && res.server) {
        if (!servers.some((s) => s._id === res.server._id)) {
          setServers((prev) => [res.server, ...prev]);
        }
        setActiveServerId(res.server._id);
        setActiveChannelId(res.server.channels?.[0]?._id);
        setActiveTab('rooms');
        setActiveDirectChat(null);
        setJoinModalOpen(false);
        setInviteCodeInput('');
        toast.success(`Joined room "${res.server.name}"!`);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error('Failed to join room');
    }
  };

  // Copy Invite Code
  const handleCopyInvite = () => {
    if (currentServer?.inviteCode) {
      navigator.clipboard.writeText(currentServer.inviteCode);
      setCopiedInvite(true);
      toast.success('Invite code copied to clipboard');
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const filteredUsers = directUsers.filter((u) => {
    const query = searchQuery.toLowerCase();
    const name = (u.user_name || u.name || '').toLowerCase();
    return name.includes(query);
  });

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden select-none font-sans">
      {/* ========================================================= */}
      {/* 1. LEFT PANEL: MESSAGES & SQUAD ROOMS SIDEBAR             */}
      {/* ========================================================= */}
      <div className="w-72 sm:w-80 h-full border-r border-border bg-card/20 flex flex-col shrink-0">
        {/* Header & Quick Action */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h2 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Messages & Rooms
            </h2>
            <p className="text-[11px] text-muted-foreground">Real-time chats & squad lounges</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 rounded-lg bg-secondary/40 border-border text-foreground hover:bg-secondary"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-border text-foreground">
              <DropdownMenuItem
                onClick={() => setServerModalOpen(true)}
                className="text-xs cursor-pointer gap-2"
              >
                <Plus className="w-3.5 h-3.5 text-primary" /> Create Squad Room
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setJoinModalOpen(true)}
                className="text-xs cursor-pointer gap-2"
              >
                <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" /> Join with Invite Code
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Segmented Control: Direct Chats vs Squad Rooms */}
        <div className="p-2 border-b border-border bg-card/10">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-secondary/40 border border-border/80">
            <button
              onClick={() => setActiveTab('dm')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'dm'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <AtSign className="w-3.5 h-3.5" /> Direct ({directUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'rooms'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Squads ({servers.length})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {activeTab === 'dm' && (
          <div className="px-3 pt-2">
            <div className="flex items-center gap-2 bg-secondary/30 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter developers..."
                className="bg-transparent border-none text-foreground placeholder-muted-foreground focus:outline-none w-full text-xs"
              />
            </div>
          </div>
        )}

        {/* Content Stream: Direct Chats or Squad Rooms */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* TAB 1: DIRECT MESSAGES */}
          {activeTab === 'dm' && (
            <div className="space-y-1">
              {filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                  <AtSign className="w-6 h-6 mx-auto text-muted-foreground/40" />
                  <p>No direct chats found.</p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Follow developers on the feed or pair-debug together to start messaging.
                  </p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = activeDirectChat?.targetUser?.id === user.id || activeDirectChat?.targetUser?._id === user._id;
                  const username = user.user_name || user.name || 'Developer';
                  return (
                    <button
                      key={user.id || user._id}
                      onClick={() => handleSelectDm(user)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors ${
                        isSelected
                          ? 'bg-secondary text-foreground font-semibold border border-border/80'
                          : 'hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <UserAvatar
                        user={{ user_name: username, image: user.image || user.avatar, name: user.name }}
                        className="h-8 w-8 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate text-foreground">@{username}</p>
                        <p className="text-[11px] text-muted-foreground truncate">Click to chat</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: SQUAD & DEV ROOMS */}
          {activeTab === 'rooms' && (
            <div className="space-y-3">
              {servers.length === 0 ? (
                /* Clean Empty State: No Fake Dummy Rooms */
                <div className="p-5 text-center space-y-3 bg-secondary/15 rounded-2xl border border-dashed border-border/80 mx-2 mt-2">
                  <div className="w-10 h-10 rounded-xl bg-secondary/40 border border-border flex items-center justify-center mx-auto text-muted-foreground">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-foreground">No Squad Rooms Yet</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Create a squad room for your hackathon team, pair-debugging, or dev collective.
                    </p>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <Button
                      size="sm"
                      onClick={() => setServerModalOpen(true)}
                      className="w-full text-xs gap-1.5 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Squad Room
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setJoinModalOpen(true)}
                      className="w-full text-xs gap-1.5 font-semibold"
                    >
                      Join via Invite Code
                    </Button>
                  </div>
                </div>
              ) : (
                /* List of Real User Servers */
                servers.map((server) => {
                  const isCurrentServer = activeServerId === server._id;
                  const textChans = (server.channels || []).filter((c: any) => c.type === 'text');
                  const mediaChans = (server.channels || []).filter(
                    (c: any) => c.type === 'voice' || c.type === 'video'
                  );

                  return (
                    <div key={server._id} className="rounded-xl border border-border/80 bg-card/30 p-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-foreground truncate">{server.name}</h4>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setActiveServerId(server._id);
                              setChannelModalOpen(true);
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                            title="Add Channel"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Text Channels */}
                      {textChans.length > 0 && (
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                            Text Channels
                          </span>
                          {textChans.map((channel: any) => {
                            const isChanActive = activeChannelId === channel._id;
                            return (
                              <button
                                key={channel._id}
                                onClick={() => handleSelectChannel(server, channel)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                                  isChanActive
                                    ? 'bg-secondary text-foreground font-semibold'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                                }`}
                              >
                                <Hash className="w-3.5 h-3.5 shrink-0 text-primary" />
                                <span className="truncate">{channel.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Voice & Video Rooms */}
                      {mediaChans.length > 0 && (
                        <div className="space-y-0.5 pt-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                            Voice & Video
                          </span>
                          {mediaChans.map((channel: any) => {
                            const isChanActive = activeChannelId === channel._id;
                            return (
                              <button
                                key={channel._id}
                                onClick={() => handleSelectChannel(server, channel)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                                  isChanActive
                                    ? 'bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/30'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                                }`}
                              >
                                {channel.type === 'video' ? (
                                  <Video className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                                ) : (
                                  <Volume2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                                )}
                                <span className="truncate">{channel.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* User Profile & Media Status Dock */}
        <div className="p-3 border-t border-border bg-card/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar
              user={{ user_name: currentUser.user_name, image: currentUser.image || currentUser.avatar, name: currentUser.name }}
              className="h-8 w-8 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">
                @{currentUser.user_name || 'developer'}
              </p>
              <p className="text-[10px] text-emerald-500 font-medium">Online</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-1.5 rounded-lg transition-colors ${
                isMuted ? 'text-rose-400 bg-rose-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsDeafened(!isDeafened)}
              className={`p-1.5 rounded-lg transition-colors ${
                isDeafened ? 'text-rose-400 bg-rose-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. RIGHT PANEL: ACTIVE CHAT / WORKSPACE                   */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
        {activeDirectChat ? (
          /* Realtime Direct Message Stream */
          <RealtimeChatView
            directChat={activeDirectChat}
            currentUser={currentUser}
          />
        ) : currentChannel ? (
          /* Active Channel: Voice/Video Stage vs Text Lounge */
          currentChannel.type === 'voice' || currentChannel.type === 'video' ? (
            <VoiceVideoStage
              channel={currentChannel}
              currentUser={currentUser}
              onDisconnect={() => {
                setActiveVoiceChannel(null);
                setActiveChannelId(null);
              }}
            />
          ) : (
            <RealtimeChatView
              channel={currentChannel}
              serverId={currentServer?._id}
              currentUser={currentUser}
            />
          )
        ) : (
          /* Clean Nerd'sHive Welcome & Launchpad: NO FAKE DUMMY CHANNELS */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
            <div className="w-16 h-16 rounded-2xl bg-secondary/30 border border-border flex items-center justify-center mb-4 text-muted-foreground">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Developer Messages & Squad Lounges</h2>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
              Select a direct conversation from the left to chat, or launch a squad room with real-time text, voice, and collaborative video.
            </p>
            <div className="flex items-center gap-2.5 mt-5">
              <Button
                size="sm"
                onClick={() => setServerModalOpen(true)}
                className="text-xs gap-1.5 font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Create Squad Room
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setJoinModalOpen(true)}
                className="text-xs gap-1.5 font-semibold"
              >
                Join with Code
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODALS: CREATE SQUAD ROOM, CREATE CHANNEL, JOIN WITH CODE */}
      {/* ========================================================= */}

      {/* 1. Create Squad Room Modal */}
      <Dialog open={serverModalOpen} onOpenChange={setServerModalOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Create Squad Room
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Room Name</label>
              <Input
                placeholder="e.g. Solana Hackathon Team or Next.js Core"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                className="bg-secondary/40 border-border text-foreground text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Description (Optional)</label>
              <Input
                placeholder="e.g. Multi-party pair debugging & design sprint"
                value={newServerDesc}
                onChange={(e) => setNewServerDesc(e.target.value)}
                className="bg-secondary/40 border-border text-foreground text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="ghost" onClick={() => setServerModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateServer} disabled={!newServerName.trim()} className="text-xs font-semibold">
                Create Room
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Create Channel Modal */}
      <Dialog open={channelModalOpen} onOpenChange={setChannelModalOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Add Channel
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Channel Type</label>
              <Select value={newChannelType} onValueChange={(val: any) => setNewChannelType(val)}>
                <SelectTrigger className="bg-secondary/40 border-border text-foreground text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-foreground">
                  <SelectItem value="text"># Text Discussion</SelectItem>
                  <SelectItem value="voice">🔊 Low-Latency Voice Lounge</SelectItem>
                  <SelectItem value="video">📹 Pair-Hacking & Screen Share Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Channel Name</label>
              <Input
                placeholder="e.g. api-design or pair-lounge"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="bg-secondary/40 border-border text-foreground text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Topic (Optional)</label>
              <Input
                placeholder="e.g. Reviewing PRs and backend architecture"
                value={newChannelTopic}
                onChange={(e) => setNewChannelTopic(e.target.value)}
                className="bg-secondary/40 border-border text-foreground text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="ghost" onClick={() => setChannelModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateChannel} disabled={!newChannelName.trim()} className="text-xs font-semibold">
                Create Channel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Join Server with Invite Code Modal */}
      <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-primary" /> Join with Invite Code
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Invite Code</label>
              <Input
                placeholder="e.g. nerdshive-hub-xxxxxx"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                className="bg-secondary/40 border-border text-foreground text-xs font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="ghost" onClick={() => setJoinModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleJoinServer} disabled={!inviteCodeInput.trim()} className="text-xs font-semibold">
                Join Squad Room
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default DiscordLayout;
