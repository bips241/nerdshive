'use client';

import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Peer, { DataConnection } from 'peerjs';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Shield,
  GraduationCap,
  MapPin,
  Clock,
  Flame,
  Bug,
  Sparkles,
  MessageSquare,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import { toast } from 'sonner';
import { getSocketServerUrl, getPeerServerConfig } from '@/lib/webrtc-utils';
import { respondToSquadRequestAction } from '@/lib/radar-actions';
import Link from 'next/link';

interface Props {
  roomId: string;
  requestId?: string;
  currentUser: {
    _id: string;
    name: string;
    user_name: string;
    image?: string;
    college?: string;
    location?: string;
    techStack?: string[];
    debugKarma?: number;
    bugsSolvedCount?: number;
  };
  counterparty?: {
    _id: string;
    name: string;
    user_name: string;
    image?: string;
    college?: string;
    location?: string;
    timezone?: string;
    techStack?: string[];
    debugKarma?: number;
    bugsSolvedCount?: number;
    bio?: string;
  } | null;
  squadContext?: {
    teamName: string;
    hackathonName: string;
    trackName?: string;
    rolesNeeded?: string[];
    isLeader: boolean;
  } | null;
  onLeave: () => void;
}

export default function RadarVettingRoom({
  roomId,
  requestId,
  currentUser,
  counterparty,
  squadContext,
  onLeave,
}: Props) {
  // Media State
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Connection State
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'waiting' | 'connected' | 'ended'>('connecting');
  const [isApproved, setIsApproved] = useState(false);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [squadServerId, setSquadServerId] = useState<string | null>(null);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const activeCallRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function initMediaAndWebRTC() {
      try {
        // 1. Get Local Camera & Mic
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Init PeerJS
        const peerConfig = getPeerServerConfig();
        const peer = new Peer(peerConfig as any);
        peerRef.current = peer;

        // 3. Init Socket.IO
        const socketUrl = getSocketServerUrl();
        const socket = io(socketUrl, {
          transports: ['websocket', 'polling'],
          withCredentials: true,
        });
        socketRef.current = socket;

        peer.on('open', (peerId) => {
          console.log('[VETTING_ROOM] Peer connected:', peerId);
          // Join direct room for this vetting call
          socket.emit('direct_room:join', {
            roomId,
            peerId,
            intent: 'vetting',
          });
        });

        // Peer incoming call handler
        peer.on('call', (call) => {
          console.log('[VETTING_ROOM] Answering incoming peer call');
          activeCallRef.current = call;
          call.answer(stream);
          call.on('stream', (remoteStream) => {
            if (remoteVideoRef.current && isMounted) {
              remoteVideoRef.current.srcObject = remoteStream;
              setConnectionStatus('connected');
            }
          });
        });

        socket.on('direct_room:waiting', () => {
          if (isMounted) setConnectionStatus('waiting');
        });

        socket.on('match_found', ({ peerId: remotePeerId, isInitiator }) => {
          console.log('[VETTING_ROOM] Match found, remote peer:', remotePeerId, 'isInitiator:', isInitiator);
          if (isMounted) setConnectionStatus('connected');

          if (isInitiator && peerRef.current) {
            const call = peerRef.current.call(remotePeerId, stream);
            activeCallRef.current = call;
            call.on('stream', (remoteStream) => {
              if (remoteVideoRef.current && isMounted) {
                remoteVideoRef.current.srcObject = remoteStream;
              }
            });
          }
        });

        socket.on('peer_disconnected', () => {
          if (isMounted) {
            setConnectionStatus('ended');
            toast.info('Counterparty left the vetting room.');
          }
        });
      } catch (err: any) {
        console.error('[VETTING_ROOM] Error initializing media:', err);
        toast.error('Could not access camera/mic: ' + (err.message || 'Permission denied'));
      }
    }

    initMediaAndWebRTC();

    return () => {
      isMounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (activeCallRef.current) {
        try { activeCallRef.current.close(); } catch (_) {}
      }
      if (peerRef.current) {
        try { peerRef.current.destroy(); } catch (_) {}
      }
      if (socketRef.current) {
        socketRef.current.emit('direct_room:leave', { roomId });
        socketRef.current.disconnect();
      }
    };
  }, [roomId]);

  // Media Controls
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        if (activeCallRef.current?.peerConnection) {
          const senders = activeCallRef.current.peerConnection.getSenders();
          const sender = senders.find((s: any) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          if (localStreamRef.current) {
            const camTrack = localStreamRef.current.getVideoTracks()[0];
            if (activeCallRef.current?.peerConnection) {
              const senders = activeCallRef.current.peerConnection.getSenders();
              const sender = senders.find((s: any) => s.track?.kind === 'video');
              if (sender) sender.replaceTrack(camTrack);
            }
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
          }
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen sharing canceled or failed', err);
      }
    } else {
      if (localStreamRef.current) {
        const camTrack = localStreamRef.current.getVideoTracks()[0];
        if (activeCallRef.current?.peerConnection) {
          const senders = activeCallRef.current.peerConnection.getSenders();
          const sender = senders.find((s: any) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(camTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      setIsScreenSharing(false);
    }
  };

  // In-Call Squad Decision: Approve Candidate
  const handleApprove = async () => {
    if (!requestId) {
      toast.error('No request ID linked with this session.');
      return;
    }

    setIsSubmittingDecision(true);
    try {
      const res = await respondToSquadRequestAction(requestId, 'accept', 'Approved live in Radar Vetting Room!');
      if (res.failure) {
        toast.error(res.failure);
      } else {
        setIsApproved(true);
        setSquadServerId(res.squadServerId || null);
        toast.success('🎉 Candidate approved & enrolled into core squad!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve candidate');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // In-Call Squad Decision: Decline Candidate
  const handleDecline = async () => {
    if (!requestId) return;
    setIsSubmittingDecision(true);
    try {
      const res = await respondToSquadRequestAction(requestId, 'reject', 'Evaluation concluded in Radar Vetting Room.');
      if (res.failure) {
        toast.error(res.failure);
      } else {
        toast.info('Request concluded. Candidate removed from queue.');
        onLeave();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-zinc-900/90 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Radar Vetting Room
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 font-mono">
                {connectionStatus === 'connected' ? 'LIVE P2P WEBRTC' : connectionStatus.toUpperCase()}
              </Badge>
            </h2>
            <p className="text-[11px] text-zinc-400">
              {squadContext?.teamName ? `Vetting for Squad: "${squadContext.teamName}"` : 'Candidate Alignment Session'}
            </p>
          </div>
        </div>

        {/* Live Status or Celebration Banner */}
        {isApproved ? (
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold animate-bounce">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Squad Member Enrolled! Private Lounge Unlocked
          </div>
        ) : (
          <div className="text-xs text-zinc-400 font-mono">
            Room: <span className="text-zinc-200">{roomId.substring(0, 14)}...</span>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onLeave}
          className="text-xs text-zinc-400 hover:text-white"
        >
          Exit Room
        </Button>
      </div>

      {/* Main Split Body: Video Feeds & Candidate Dossier */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Side: Video Streams (8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-zinc-950 p-4 gap-4 justify-between border-r border-zinc-800/80">
          {/* Video Grid */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center min-h-[360px]">
            {/* Remote Video */}
            <div className="relative w-full h-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {connectionStatus !== 'connected' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-6 text-center">
                  <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm font-semibold text-white">
                    {connectionStatus === 'waiting'
                      ? 'Waiting for partner to join this room...'
                      : 'Connecting WebRTC P2P stream...'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Send the counterparty the room link or wait for them to launch from their control panel.
                  </p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800 text-xs text-white font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {counterparty?.name || 'Counterparty'}
              </div>
            </div>

            {/* Local Video */}
            <div className="relative w-full h-full bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute bottom-3 left-3 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800 text-xs text-white font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                You ({currentUser.name})
              </div>
            </div>
          </div>

          {/* Media Control Toolbar */}
          <div className="flex items-center justify-center gap-3 bg-zinc-900/90 border border-zinc-800 py-3 px-6 rounded-2xl max-w-md mx-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleAudio}
              className={`rounded-xl h-10 w-10 transition-all ${
                isAudioMuted
                  ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleVideo}
              className={`rounded-xl h-10 w-10 transition-all ${
                isVideoDisabled
                  ? 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {isVideoDisabled ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleScreenShare}
              className={`rounded-xl h-10 w-10 transition-all ${
                isScreenSharing
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              <ScreenShare className="w-4 h-4" />
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={onLeave}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs px-4 h-10 rounded-xl flex items-center gap-1.5"
            >
              <PhoneOff className="w-4 h-4" />
              End Call
            </Button>
          </div>
        </div>

        {/* Right Side: Squad & Candidate Alignment Dossier (4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900/60 p-5 overflow-y-auto space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Candidate Header */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Candidate Proof-of-Work Matrix
              </h3>

              <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <UserAvatar user={counterparty || {}} className="w-12 h-12 rounded-xl" />
                  <div>
                    <h4 className="font-bold text-white text-sm">{counterparty?.name || 'Candidate'}</h4>
                    <p className="text-xs text-zinc-400">@{counterparty?.user_name}</p>
                  </div>
                </div>

                {/* College, Location, Timezone */}
                <div className="flex flex-wrap gap-1.5">
                  {counterparty?.college && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 font-medium">
                      <GraduationCap className="w-3 h-3 text-emerald-400" />
                      {counterparty.college}
                    </span>
                  )}
                  {counterparty?.location && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      {counterparty.location}
                    </span>
                  )}
                  {counterparty?.timezone && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">
                      <Clock className="w-3 h-3 text-amber-400" />
                      {counterparty.timezone}
                    </span>
                  )}
                </div>

                {/* Bio */}
                {counterparty?.bio && (
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    "{counterparty.bio}"
                  </p>
                )}

                {/* Tech Stack */}
                {counterparty?.techStack && counterparty.techStack.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Top Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {counterparty.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="text-[10px] px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-300 font-mono"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Karma & Solved Bugs */}
                <div className="flex items-center gap-4 pt-2 border-t border-zinc-800 text-xs font-mono">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Flame className="w-3.5 h-3.5" />
                    {counterparty?.debugKarma || 0} karma
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Bug className="w-3.5 h-3.5" />
                    {counterparty?.bugsSolvedCount || 0} solved
                  </span>
                </div>
              </div>
            </div>

            {/* Squad Requirements Review */}
            {squadContext && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  Squad Alignment Context
                </h3>
                <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Target Squad:</span>
                    <strong className="text-white">{squadContext.teamName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Hackathon:</span>
                    <span className="text-zinc-300">{squadContext.hackathonName}</span>
                  </div>
                  {squadContext.trackName && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Track:</span>
                      <span className="text-emerald-400 font-medium">{squadContext.trackName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Decision Buttons (Instant In-Call State Machine) */}
          <div className="space-y-2 pt-4 border-t border-zinc-800">
            {isApproved ? (
              <div className="space-y-2">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-5 rounded-xl shadow-lg"
                  asChild
                >
                  <Link href={`/dashboard/servers/${squadServerId || ''}`}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Open Private Squad Discord Server
                  </Link>
                </Button>
                <p className="text-[11px] text-center text-emerald-400">
                  Candidate successfully enrolled in #general and voice:pair-hacking lounge!
                </p>
              </div>
            ) : squadContext?.isLeader ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDecline}
                  disabled={isSubmittingDecision}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs h-10 rounded-xl"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1 text-red-400" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={isSubmittingDecision}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 rounded-xl shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {isSubmittingDecision ? 'Enrolling...' : 'Approve & Add'}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={isSubmittingDecision}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 rounded-xl shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                {isSubmittingDecision ? 'Joining...' : 'Accept Squad Seat'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
