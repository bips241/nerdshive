'use client';

import React, { useEffect, useState } from 'react';
import {
  Hash,
  Volume2,
  Video,
  Plus,
  Compass,
  MessageSquare,
  Users,
  Settings,
  Mic,
  MicOff,
  Headphones,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  LogOut,
  FolderPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
}

export const DiscordLayout: React.FC<DiscordLayoutProps> = ({
  currentUser,
  initialMutualFollows = [],
}) => {
  const [servers, setServers] = useState<any[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  // Direct Message Mode state
  const [isDmMode, setIsDmMode] = useState(false);
  const [directUsers, setDirectUsers] = useState<any[]>(initialMutualFollows);
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

  // 1. Fetch initial servers and fallback DMs
  useEffect(() => {
    async function loadData() {
      try {
        const userServers = await getUserServers();
        setServers(userServers);

        if (userServers.length > 0) {
          const firstServer = userServers[0];
          setActiveServerId(firstServer._id);
          const firstChannel = firstServer.channels?.[0];
          if (firstChannel) {
            setActiveChannelId(firstChannel._id);
          }
        } else {
          setIsDmMode(true);
        }

        // Fetch mutual follows for DMs if not provided
        if (directUsers.length === 0) {
          const res = await fetch('/api/chats');
          if (res.ok) {
            const data = await res.json();
            setDirectUsers(data);
          }
        }
      } catch (err) {
        console.error('Error loading servers:', err);
      }
    }

    loadData();
  }, []);

  const currentServer = servers.find((s) => s._id === activeServerId);
  const currentChannel = currentServer?.channels?.find(
    (c: any) => c._id === activeChannelId
  );

  // Handle Switch to Direct Messages
  const handleSelectDm = async (user: any) => {
    setIsDmMode(true);
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

  // Handle Switch to Server
  const handleSelectServer = (server: any) => {
    setIsDmMode(false);
    setActiveDirectChat(null);
    setActiveServerId(server._id);

    const defaultChannel =
      server.channels?.find((c: any) => c.type === 'text') ||
      server.channels?.[0];

    if (defaultChannel) {
      setActiveChannelId(defaultChannel._id);
    }
  };

  // Handle Select Channel
  const handleSelectChannel = (channel: any) => {
    setActiveChannelId(channel._id);

    if (channel.type === 'voice' || channel.type === 'video') {
      setActiveVoiceChannel(channel);
    }
  };

  // Create Server
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
        setIsDmMode(false);
        setServerModalOpen(false);
        setNewServerName('');
        setNewServerDesc('');
        toast.success(`Server "${res.server.name}" created!`);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error('Failed to create server');
    }
  };

  // Create Channel
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
        // Add if not present
        if (!servers.some((s) => s._id === res.server._id)) {
          setServers((prev) => [res.server, ...prev]);
        }
        setActiveServerId(res.server._id);
        setActiveChannelId(res.server.channels?.[0]?._id);
        setIsDmMode(false);
        setJoinModalOpen(false);
        setInviteCodeInput('');
        toast.success(`Joined server "${res.server.name}"!`);
      } else if (res.error) {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error('Failed to join server');
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

  const textChannels = currentServer?.channels?.filter((c: any) => c.type === 'text') || [];
  const voiceChannels = currentServer?.channels?.filter(
    (c: any) => c.type === 'voice' || c.type === 'video'
  ) || [];

  return (
    <div className="flex h-screen w-full bg-[#1e1f22] overflow-hidden select-none font-sans">
      {/* ========================================================= */}
      {/* 1. LEFT RAIL: SERVER LIST & DIRECT MESSAGES               */}
      {/* ========================================================= */}
      <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 border-r border-[#111214]/60 z-20 shrink-0">
        {/* Direct Messages Icon Button */}
        <button
          onClick={() => {
            setIsDmMode(true);
            setActiveServerId(null);
            if (directUsers.length > 0 && !activeDirectChat) {
              handleSelectDm(directUsers[0]);
            }
          }}
          className={`relative group w-12 h-12 flex items-center justify-center rounded-3xl hover:rounded-2xl transition-all duration-300 ${
            isDmMode
              ? 'bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/30'
              : 'bg-[#313338] text-gray-200 hover:bg-indigo-600 hover:text-white'
          }`}
          title="Direct Messages"
        >
          {/* Active Pill Indicator */}
          {isDmMode && (
            <span className="absolute -left-3 w-2 h-10 bg-white rounded-r-full transition-all" />
          )}
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Separator */}
        <div className="w-8 h-[2px] bg-[#35373c] rounded-full my-1" />

        {/* Server Icons List */}
        <div className="flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto overflow-x-hidden no-scrollbar">
          {servers.map((server) => {
            const isActive = activeServerId === server._id && !isDmMode;
            const initials = server.name.slice(0, 2).toUpperCase();

            return (
              <button
                key={server._id}
                onClick={() => handleSelectServer(server)}
                className={`relative group w-12 h-12 flex items-center justify-center rounded-3xl hover:rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-[#313338] text-gray-200 hover:bg-indigo-600 hover:text-white'
                }`}
                title={server.name}
              >
                {/* Active Pill Indicator */}
                {isActive && (
                  <span className="absolute -left-3 w-2 h-10 bg-white rounded-r-full transition-all" />
                )}
                {server.iconUrl ? (
                  <img
                    src={server.iconUrl}
                    alt={server.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <span className="font-bold text-sm tracking-wider">{initials}</span>
                )}
              </button>
            );
          })}

          {/* Add Server Button */}
          <Dialog open={serverModalOpen} onOpenChange={setServerModalOpen}>
            <DialogTrigger asChild>
              <button
                className="w-12 h-12 flex items-center justify-center rounded-3xl hover:rounded-2xl bg-[#313338] text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all duration-300 shadow-md group"
                title="Create a Server"
              >
                <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#313338] border-[#383a40] text-gray-100 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center text-gray-100">
                  Create Your Server
                </DialogTitle>
                <p className="text-xs text-center text-gray-400">
                  Your server is where you and your squad hang out. Make yours and start talking.
                </p>
              </DialogHeader>

              <div className="space-y-4 mt-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                    Server Name
                  </label>
                  <Input
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    placeholder="e.g. Distributed Systems Club"
                    className="bg-[#1e1f22] border-[#383a40] text-gray-200"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                    Description
                  </label>
                  <Input
                    value={newServerDesc}
                    onChange={(e) => setNewServerDesc(e.target.value)}
                    placeholder="What is this community about?"
                    className="bg-[#1e1f22] border-[#383a40] text-gray-200"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button
                    variant="link"
                    onClick={() => {
                      setServerModalOpen(false);
                      setJoinModalOpen(true);
                    }}
                    className="text-xs text-indigo-400 p-0"
                  >
                    Have an invite already? Join Server
                  </Button>
                  <Button
                    onClick={handleCreateServer}
                    disabled={!newServerName.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Join Server Modal */}
          <Dialog open={joinModalOpen} onOpenChange={setJoinModalOpen}>
            <DialogContent className="bg-[#313338] border-[#383a40] text-gray-100 sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center text-gray-100">
                  Join a Server
                </DialogTitle>
                <p className="text-xs text-center text-gray-400">
                  Enter an invite code below to join an existing community.
                </p>
              </DialogHeader>

              <div className="space-y-4 mt-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                    Invite Code
                  </label>
                  <Input
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value)}
                    placeholder="e.g. nerdshive-hub-abc123"
                    className="bg-[#1e1f22] border-[#383a40] text-gray-200"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setJoinModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleJoinServer}
                    disabled={!inviteCodeInput.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Join Server
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MIDDLE COLUMN: CHANNELS OR DIRECT MESSAGES             */}
      {/* ========================================================= */}
      <div className="w-60 bg-[#2b2d31] flex flex-col justify-between shrink-0 border-r border-[#1f2023]/60 z-10">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          {isDmMode ? (
            <div className="h-12 px-4 border-b border-[#1f2023] flex items-center shadow-sm">
              <h2 className="font-bold text-sm text-gray-200 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Direct Messages
              </h2>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-12 px-4 border-b border-[#1f2023] flex items-center justify-between shadow-sm hover:bg-[#35373c]/50 transition-colors w-full text-left">
                  <span className="font-bold text-sm text-gray-200 truncate">
                    {currentServer?.name || 'Server'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-[#111214] border-[#2b2d31] text-gray-200">
                <DropdownMenuItem
                  onClick={handleCopyInvite}
                  className="flex items-center justify-between text-indigo-400 focus:bg-indigo-600 focus:text-white cursor-pointer"
                >
                  <span>Invite People</span>
                  {copiedInvite ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#2b2d31]" />
                <DropdownMenuItem
                  onClick={() => setChannelModalOpen(true)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Channel</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Body: Channels or DM list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4 no-scrollbar">
            {isDmMode ? (
              /* Direct Message Contacts */
              <div className="space-y-0.5">
                <p className="px-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Direct Messages ({directUsers.length})
                </p>
                {directUsers.length === 0 ? (
                  <div className="p-4 text-xs text-gray-400 text-center">
                    Follow creators on NerdShive to start direct messaging.
                  </div>
                ) : (
                  directUsers.map((user) => {
                    const isSelected =
                      activeDirectChat?.targetUser?.id === user.id ||
                      activeDirectChat?.targetUser?._id === user.id;
                    const name = user.name || user.user_name || 'Developer';
                    const avatar = user.avatar || user.image || '';

                    return (
                      <button
                        key={user.id}
                        onClick={() => handleSelectDm(user)}
                        className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-[#35373c] text-white'
                            : 'text-gray-400 hover:bg-[#35373c]/50 hover:text-gray-200'
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={avatar} />
                            <AvatarFallback className="bg-indigo-600 text-xs font-bold text-white">
                              {name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#2b2d31]" />
                        </div>
                        <span className="truncate">{name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              /* Server Channel List */
              <>
                {/* Text Channels Category */}
                <div>
                  <div className="flex items-center justify-between px-2 mb-1 group">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Text Channels
                    </span>
                    <button
                      onClick={() => {
                        setNewChannelType('text');
                        setChannelModalOpen(true);
                      }}
                      className="text-gray-400 hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Create Text Channel"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    {textChannels.map((c: any) => {
                      const isSelected = activeChannelId === c._id;
                      return (
                        <button
                          key={c._id}
                          onClick={() => handleSelectChannel(c)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-[#35373c] text-white'
                              : 'text-gray-400 hover:bg-[#35373c]/50 hover:text-gray-200'
                          }`}
                        >
                          <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="truncate">{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Voice & Video Channels Category */}
                <div>
                  <div className="flex items-center justify-between px-2 mb-1 group">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Voice & Video
                    </span>
                    <button
                      onClick={() => {
                        setNewChannelType('voice');
                        setChannelModalOpen(true);
                      }}
                      className="text-gray-400 hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Create Voice Channel"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-0.5">
                    {voiceChannels.map((c: any) => {
                      const isSelected = activeChannelId === c._id;
                      const isConnected = activeVoiceChannel?._id === c._id;

                      return (
                        <button
                          key={c._id}
                          onClick={() => handleSelectChannel(c)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-[#35373c] text-white'
                              : 'text-gray-400 hover:bg-[#35373c]/50 hover:text-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {c.type === 'video' ? (
                              <Video className="w-4 h-4 text-indigo-400 shrink-0" />
                            ) : (
                              <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                            <span className="truncate">{c.name}</span>
                          </div>

                          {isConnected && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Create Channel Modal */}
        <Dialog open={channelModalOpen} onOpenChange={setChannelModalOpen}>
          <DialogContent className="bg-[#313338] border-[#383a40] text-gray-100 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-100">
                Create Channel
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-3">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Channel Type
                </label>
                <Select
                  value={newChannelType}
                  onValueChange={(v: any) => setNewChannelType(v)}
                >
                  <SelectTrigger className="bg-[#1e1f22] border-[#383a40] text-gray-200">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2b2d31] border-[#383a40] text-gray-200">
                    <SelectItem value="text"># Text Channel</SelectItem>
                    <SelectItem value="voice">🔊 Voice Channel</SelectItem>
                    <SelectItem value="video">📹 Video / Screen Share</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Channel Name
                </label>
                <Input
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. system-design"
                  className="bg-[#1e1f22] border-[#383a40] text-gray-200"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Topic (Optional)
                </label>
                <Input
                  value={newChannelTopic}
                  onChange={(e) => setNewChannelTopic(e.target.value)}
                  placeholder="What happens in this channel?"
                  className="bg-[#1e1f22] border-[#383a40] text-gray-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setChannelModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateChannel}
                  disabled={!newChannelName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Create Channel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* User Card at bottom of middle column */}
        <div className="h-14 bg-[#232428] px-3 flex items-center justify-between border-t border-[#1f2023]/60">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser.avatar || currentUser.image} />
                <AvatarFallback className="bg-indigo-600 text-xs font-bold text-white">
                  {(currentUser.user_name || currentUser.name || 'ME').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#232428]" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-gray-200 truncate">
                {currentUser.user_name || currentUser.name || 'Developer'}
              </p>
              <p className="text-[10px] text-gray-400 font-mono">#0001</p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 text-gray-400">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 hover:bg-[#35373c] hover:text-gray-200 rounded transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsDeafened(!isDeafened)}
              className="p-1.5 hover:bg-[#35373c] hover:text-gray-200 rounded transition-colors"
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              <Headphones className={`w-4 h-4 ${isDeafened ? 'text-rose-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MAIN CONTENT STAGE                                     */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#313338]">
        {currentChannel && (currentChannel.type === 'voice' || currentChannel.type === 'video') ? (
          /* Multi-Party Voice / Video Room Stage */
          <VoiceVideoStage
            channel={currentChannel}
            currentUser={currentUser}
            onDisconnect={() => {
              setActiveVoiceChannel(null);
              // Fallback to general text channel
              const generalChannel = currentServer?.channels?.find((c: any) => c.type === 'text');
              if (generalChannel) setActiveChannelId(generalChannel._id);
            }}
          />
        ) : (
          /* Realtime Text Chat Stage (replaces Firebase fireChat) */
          <RealtimeChatView
            channel={currentChannel}
            serverId={activeServerId || undefined}
            directChat={isDmMode ? activeDirectChat : undefined}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
};
