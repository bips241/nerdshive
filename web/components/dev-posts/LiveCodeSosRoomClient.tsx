'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Peer, { DataConnection } from 'peerjs';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Code2,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  Terminal,
  Bug,
  AlertCircle,
  Award,
  CheckCircle2,
  Loader2,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import { toast } from 'sonner';
import { resolveCodeSosPost } from '@/lib/actions';
import { getIceServers, getSocketServerUrl, getPeerServerConfig } from '@/lib/webrtc-utils';

interface Props {
  post: {
    _id: string;
    title: string;
    snippet: string;
    errorLog?: string;
    triedSteps?: string;
    language: string;
    bountyKarma: number;
    author: {
      _id: string;
      user_name: string;
      name: string;
      image?: string;
    };
  };
  currentUser: {
    _id: string;
    user_name: string;
    name: string;
    image?: string;
  };
  isAuthor: boolean;
}

export default function LiveCodeSosRoomClient({ post, currentUser, isAuthor }: Props) {
  const router = useRouter();

  // WebRTC & Media States
  const [connected, setConnected] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Synchronized Code Editor State
  const [codeContent, setCodeContent] = useState(post.snippet);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showErrorLog, setShowErrorLog] = useState(!!post.errorLog);

  // In-Room Resolution Modal State
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [solutionSummary, setSolutionSummary] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isResolved, setIsResolved] = useState(false);

  // Video Element Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Network Refs
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const activeCallRef = useRef<any>(null);
  const dataConnectionRef = useRef<DataConnection | null>(null);

  // Deterministic Room ID bound specifically to this Code SOS post
  const roomId = `sos_${post._id}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeContent);
    setCopiedCode(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCodeChange = (newCode: string) => {
    setCodeContent(newCode);
    if (dataConnectionRef.current && dataConnectionRef.current.open) {
      dataConnectionRef.current.send({
        type: 'CODE_SYNC',
        code: newCode,
      });
    }
  };

  const handleMarkResolved = async () => {
    if (!solutionSummary.trim()) {
      toast.error('Please provide a brief solution summary.');
      return;
    }

    setIsResolving(true);
    try {
      const res = await resolveCodeSosPost({
        postId: post._id,
        solutionSummary: solutionSummary.trim(),
      });

      if (res?.success) {
        setIsResolved(true);
        setShowResolveModal(false);
        toast.success(`Bug marked resolved! +${post.bountyKarma} Karma awarded to the helper! 🎉`);
      } else {
        toast.error(res?.failure || 'Failed to resolve SOS');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error resolving SOS');
    } finally {
      setIsResolving(false);
    }
  };

  // Teardown connections
  const teardownAll = useCallback(() => {
    if (activeCallRef.current) {
      try {
        activeCallRef.current.close();
      } catch (_) {}
      activeCallRef.current = null;
    }

    if (dataConnectionRef.current) {
      try {
        dataConnectionRef.current.close();
      } catch (_) {}
      dataConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch (_) {}
      peerRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.emit('direct_room:leave', { roomId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [roomId]);

  // Establish WebRTC & Socket Connection
  useEffect(() => {
    let isSubscribed = true;

    async function initMediaAndSignaling() {
      try {
        // 1. Acquire Local Camera/Mic
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Connect to Signaling Gateway
        const socketUrl = getSocketServerUrl();
        const socket = io(socketUrl, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          withCredentials: true,
        });
        socketRef.current = socket;

        // 3. Initialize PeerJS
        const peerConfig = getPeerServerConfig();
        const generatedPeerId = `sos_${currentUser._id.slice(-6)}_${Math.random().toString(36).slice(2, 6)}`;
        const peer = new Peer(generatedPeerId, peerConfig as any);
        peerRef.current = peer;

        peer.on('open', (pId) => {
          if (!isSubscribed) return;
          console.log('[CODE_SOS_ROOM] Peer opened with ID:', pId);
          // Join deterministic direct room for this post
          socket.emit('direct_room:join', { roomId, peerId: pId, intent: 'code_sos' });
        });

        // Setup DataConnection for live code sync
        const setupDataConnection = (conn: DataConnection) => {
          dataConnectionRef.current = conn;
          conn.on('data', (data: any) => {
            if (data && typeof data === 'object' && data.type === 'CODE_SYNC') {
              setCodeContent(data.code);
            }
          });
        };

        peer.on('connection', (conn) => {
          setupDataConnection(conn);
        });

        // Handle Incoming Video Call
        peer.on('call', (call) => {
          activeCallRef.current = call;
          call.answer(localStreamRef.current || undefined);

          call.on('stream', (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setConnected(true);
            setWaiting(false);
          });

          call.on('close', () => {
            setConnected(false);
            setWaiting(true);
          });
        });

        // Socket Events
        socket.on('direct_room:waiting', () => {
          if (!isSubscribed) return;
          setWaiting(true);
          setConnected(false);
        });

        socket.on('match_found', ({ peerId: targetPeerId, isInitiator }) => {
          if (!isSubscribed) return;
          console.log('[CODE_SOS_ROOM] Peer connected:', targetPeerId, 'isInitiator:', isInitiator);

          if (isInitiator && localStreamRef.current) {
            // Establish Data Channel
            const conn = peer.connect(targetPeerId);
            setupDataConnection(conn);

            // Place WebRTC Call
            const call = peer.call(targetPeerId, localStreamRef.current);
            activeCallRef.current = call;

            call.on('stream', (remoteStream) => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream;
              }
              setConnected(true);
              setWaiting(false);
            });

            call.on('close', () => {
              setConnected(false);
              setWaiting(true);
            });
          }
        });

        socket.on('left', () => {
          if (!isSubscribed) return;
          setConnected(false);
          setWaiting(true);
          toast.info('Peer has left the debug room.');
        });
      } catch (err: any) {
        console.error('[CODE_SOS_ROOM] Setup error:', err);
        toast.error('Unable to access camera/microphone or connect to signaling server.');
      }
    }

    initMediaAndSignaling();

    return () => {
      isSubscribed = false;
      teardownAll();
    };
  }, [roomId, currentUser._id, teardownAll]);

  // Media Toggle Controls
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
    if (isScreenSharing) {
      // Revert back to webcam
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const newVideoTrack = camStream.getVideoTracks()[0];

        if (activeCallRef.current && activeCallRef.current.peerConnection) {
          const sender = activeCallRef.current.peerConnection
            .getSenders()
            .find((s: any) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(newVideoTrack);
        }

        if (localStreamRef.current) {
          const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldVideoTrack) oldVideoTrack.stop();
          localStreamRef.current.removeTrack(oldVideoTrack);
          localStreamRef.current.addTrack(newVideoTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        setIsScreenSharing(false);
      } catch (err) {
        console.error('Failed to revert to webcam:', err);
      }
    } else {
      // Start Screen Share
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        if (activeCallRef.current && activeCallRef.current.peerConnection) {
          const sender = activeCallRef.current.peerConnection
            .getSenders()
            .find((s: any) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }

        if (localStreamRef.current) {
          const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldVideoTrack) oldVideoTrack.stop();
          localStreamRef.current.removeTrack(oldVideoTrack);
          localStreamRef.current.addTrack(screenTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen sharing canceled or failed:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-foreground flex flex-col">
      {/* Top Session Header */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-900/60 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/p/${post._id}`}>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1.5 text-neutral-400 hover:text-foreground">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Post
            </Button>
          </Link>

          <div className="h-4 w-px bg-neutral-800" />

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
              <Bug className="w-3 h-3" /> Code SOS Live Session
            </span>
            <span className="text-xs font-bold text-neutral-200 truncate max-w-xs sm:max-w-md">
              {post.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="text-[10px] uppercase font-mono bg-neutral-900 border-neutral-800">
            {post.language}
          </Badge>

          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Award className="w-3 h-3" /> +{post.bountyKarma} Karma Bounty
          </span>

          {isAuthor && !isResolved && (
            <Button
              size="sm"
              onClick={() => setShowResolveModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Bug Resolved
            </Button>
          )}
        </div>
      </header>

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Pane (7 cols): Live Synchronized Code Workspace */}
        <div className="lg:col-span-7 flex flex-col border-r border-neutral-800 bg-neutral-950 overflow-hidden">
          {/* Workspace Toolbar */}
          <div className="h-10 border-b border-neutral-800 bg-neutral-900/40 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-neutral-300">
                Synchronized Scratchpad
              </span>
              <span className="text-[10px] text-muted-foreground">
                (Edits sync live with peer)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {post.errorLog && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowErrorLog(!showErrorLog)}
                  className="h-7 text-[11px] gap-1 text-red-400 hover:bg-red-500/10"
                >
                  <Terminal className="w-3 h-3" />
                  {showErrorLog ? 'Hide Trace' : 'View Error Trace'}
                </Button>
              )}
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
          </div>

          {/* Collapsible Error Trace Inspector */}
          {showErrorLog && post.errorLog && (
            <div className="border-b border-neutral-800 bg-red-950/20 p-3 shrink-0 max-h-40 overflow-y-auto">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 mb-1">
                <AlertCircle className="w-3.5 h-3.5" /> Stack Trace / Error Log:
              </div>
              <pre className="font-mono text-[11px] text-red-300 whitespace-pre-wrap leading-relaxed">
                <code>{post.errorLog}</code>
              </pre>
            </div>
          )}

          {/* Code Editor Area */}
          <div className="flex-1 p-3 overflow-y-auto font-mono text-xs">
            <textarea
              value={codeContent}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="// Paste reproducible code or start collaborative debugging..."
              className="w-full h-full min-h-[300px] bg-transparent resize-none outline-none font-mono text-xs leading-relaxed text-neutral-200 placeholder:text-neutral-600"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right Pane (5 cols): WebRTC Video & Audio Stage */}
        <div className="lg:col-span-5 flex flex-col bg-neutral-900/30 overflow-hidden">
          {/* Video Grid */}
          <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 overflow-y-auto">
            {/* Remote Peer Feed */}
            <div className="relative aspect-video rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center shadow-md">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover ${connected ? 'block' : 'hidden'}`}
              />

              {!connected && (
                <div className="text-center p-4 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400 animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                  <p className="text-xs font-medium text-neutral-300">
                    {waiting ? 'Waiting for partner to join session...' : 'Connecting audio & video...'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Both the author and helper connect to this private room.
                  </p>
                </div>
              )}

              {connected && (
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-white">
                  Debugging Partner
                </div>
              )}
            </div>

            {/* Local Feed */}
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

              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] font-semibold text-white flex items-center gap-1.5">
                <span>You ({currentUser.user_name})</span>
                {isAudioMuted && <MicOff className="w-3 h-3 text-red-400" />}
              </div>
            </div>
          </div>

          {/* Bottom Floating Control Bar */}
          <div className="h-16 border-t border-neutral-800 bg-neutral-950/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isAudioMuted ? 'destructive' : 'secondary'}
                onClick={toggleAudio}
                className="h-9 w-9 p-0 rounded-full"
                title={isAudioMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>

              <Button
                size="sm"
                variant={isVideoDisabled ? 'destructive' : 'secondary'}
                onClick={toggleVideo}
                className="h-9 w-9 p-0 rounded-full"
                title={isVideoDisabled ? 'Enable Camera' : 'Disable Camera'}
              >
                {isVideoDisabled ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </Button>

              <Button
                size="sm"
                variant={isScreenSharing ? 'default' : 'secondary'}
                onClick={toggleScreenShare}
                className={`h-9 w-9 p-0 rounded-full ${isScreenSharing ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                title="Share Screen"
              >
                <ScreenShare className="w-4 h-4" />
              </Button>
            </div>

            <Link href={`/dashboard/p/${post._id}`}>
              <Button
                size="sm"
                variant="destructive"
                className="h-9 px-3 text-xs gap-1.5 font-semibold rounded-full"
              >
                <PhoneOff className="w-3.5 h-3.5" /> Leave Room
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Author Resolution Dialog */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="space-y-1">
              <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Mark Code SOS as Resolved
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Confirm that this bug was resolved. Summarizing the fix credits +{post.bountyKarma} Karma to your helper and helps other engineers facing this error.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                Solution Summary / Fix Notes:
              </label>
              <textarea
                value={solutionSummary}
                onChange={(e) => setSolutionSummary(e.target.value)}
                placeholder="e.g. Fixed state race condition by moving the listener inside useEffect with cleanup..."
                className="w-full h-24 p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs leading-relaxed outline-none focus:border-emerald-500 text-neutral-200 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <Button
                size="sm"
                variant="ghost"
                disabled={isResolving}
                onClick={() => setShowResolveModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isResolving || !solutionSummary.trim()}
                onClick={handleMarkResolved}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
              >
                {isResolving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Fix & Credit Karma
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
