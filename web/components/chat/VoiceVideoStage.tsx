'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Volume2,
  VolumeX,
  Users,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface VoiceVideoStageProps {
  channel: {
    _id: string;
    name: string;
    type: 'voice' | 'video';
    topic?: string;
  };
  currentUser: {
    _id?: string;
    id?: string;
    user_name?: string;
    name?: string;
    image?: string;
    avatar?: string;
  };
  onDisconnect?: () => void;
}

interface PeerParticipant {
  socketId: string;
  user: {
    _id?: string;
    id?: string;
    user_name?: string;
    name?: string;
    image?: string;
    avatar?: string;
  };
  stream?: MediaStream;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
}

export const VoiceVideoStage: React.FC<VoiceVideoStageProps> = ({
  channel,
  currentUser,
  onDisconnect,
}) => {
  const [peers, setPeers] = useState<Map<string, PeerParticipant>>(new Map());
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(channel.type === 'voice');
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakingLocal, setIsSpeakingLocal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const signalingUrl =
    process.env.NEXT_PUBLIC_SIGNALING_URL ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:10000'
      : 'https://nerdshive.online');

  // ICE Server configuration (STUN/TURN)
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  // Helper to get user display name
  const getUserName = (u: any) => u?.user_name || u?.name || 'Anonymous Dev';
  const getUserAvatar = (u: any) => u?.image || u?.avatar || '';

  // Local Voice Activity Detection (VAD)
  const setupLocalVAD = useCallback((stream: MediaStream) => {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let speakingTimeout: NodeJS.Timeout | null = null;

      const checkAudioLevel = () => {
        if (!analyserRef.current || !localStreamRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);
        const sum = buffer.reduce((a, b) => a + b, 0);
        const average = sum / buffer.length;

        // VAD threshold (sensitivity)
        const isSpeakingNow = average > 22 && !isAudioMuted;

        if (isSpeakingNow) {
          setIsSpeakingLocal(true);
          if (socketRef.current) {
            socketRef.current.emit('voice:speaking', {
              channelId: channel._id,
              isSpeaking: true,
            });
          }
          if (speakingTimeout) clearTimeout(speakingTimeout);
          speakingTimeout = setTimeout(() => {
            setIsSpeakingLocal(false);
            if (socketRef.current) {
              socketRef.current.emit('voice:speaking', {
                channelId: channel._id,
                isSpeaking: false,
              });
            }
          }, 350);
        }

        requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (err) {
      console.warn('VAD AudioContext initialization skipped:', err);
    }
  }, [channel._id, isAudioMuted]);

  // Create WebRTC Peer Connection to another participant
  const createPeerConnection = useCallback((targetSocketId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.current.set(targetSocketId, pc);

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote tracks
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setPeers((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetSocketId);
        if (existing) {
          next.set(targetSocketId, { ...existing, stream: remoteStream });
        }
        return next;
      });
    };

    // Send ICE candidates to remote peer via signaling socket
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('voice:signal', {
          targetSocketId,
          signal: { type: 'candidate', candidate: event.candidate },
          fromUser: currentUser,
        });
      }
    };

    // If initiator, generate SDP offer
    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          if (socketRef.current) {
            socketRef.current.emit('voice:signal', {
              targetSocketId,
              signal: { type: 'sdp', sdp: pc.localDescription },
              fromUser: currentUser,
            });
          }
        })
        .catch((err) => console.error('Error creating offer:', err));
    }

    return pc;
  }, [currentUser]);

  // Join Voice Channel
  useEffect(() => {
    let active = true;

    async function initMediaAndConnect() {
      try {
        setConnectionStatus('connecting');

        // 1. Get user media (mic & optional camera)
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: channel.type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current && channel.type === 'video') {
          localVideoRef.current.srcObject = stream;
        }

        setupLocalVAD(stream);

        // 2. Connect to Socket.io Signaling
        const socket = io(signalingUrl, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          setConnectionStatus('connected');
          toast.success(`Connected to 🔊 #${channel.name}`);
          socket.emit('voice:join', {
            channelId: channel._id,
            user: currentUser,
          });
        });

        // 3. Receive existing peers in room
        socket.on('voice:peers_list', ({ peers: existingPeers }: { peers: PeerParticipant[] }) => {
          const map = new Map<string, PeerParticipant>();
          existingPeers.forEach((p) => {
            map.set(p.socketId, p);
            // Initiate WebRTC connection to each existing peer
            createPeerConnection(p.socketId, true);
          });
          setPeers(map);
        });

        // 4. Handle new peer joined
        socket.on('voice:user_joined', ({ socketId, user }: { socketId: string; user: any }) => {
          setPeers((prev) => {
            const next = new Map(prev);
            next.set(socketId, { socketId, user });
            return next;
          });
          toast.info(`${getUserName(user)} joined the channel`);
        });

        // 5. Handle WebRTC Signaling Offer / Answer / ICE
        socket.on('voice:signal', async ({ fromSocketId, signal, fromUser }: any) => {
          let pc = peerConnections.current.get(fromSocketId);
          if (!pc) {
            pc = createPeerConnection(fromSocketId, false);
            setPeers((prev) => {
              const next = new Map(prev);
              if (!next.has(fromSocketId)) {
                next.set(fromSocketId, { socketId: fromSocketId, user: fromUser });
              }
              return next;
            });
          }

          if (signal.type === 'sdp') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            if (signal.sdp.type === 'offer') {
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              socket.emit('voice:signal', {
                targetSocketId: fromSocketId,
                signal: { type: 'sdp', sdp: pc.localDescription },
                fromUser: currentUser,
              });
            }
          } else if (signal.type === 'candidate') {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (err) {
              console.warn('Error adding ICE candidate:', err);
            }
          }
        });

        // 6. Remote Speaking Status
        socket.on('voice:speaking_status', ({ socketId, isSpeaking }: any) => {
          setPeers((prev) => {
            const next = new Map(prev);
            const peer = next.get(socketId);
            if (peer) {
              next.set(socketId, { ...peer, isSpeaking });
            }
            return next;
          });
        });

        // 7. Remote Media Status (mute, video off, screen share)
        socket.on('voice:media_status', ({ socketId, isMuted, isVideoOff, isScreenSharing }: any) => {
          setPeers((prev) => {
            const next = new Map(prev);
            const peer = next.get(socketId);
            if (peer) {
              next.set(socketId, { ...peer, isMuted, isVideoOff, isScreenSharing });
            }
            return next;
          });
        });

        // 8. Remote User Left
        socket.on('voice:user_left', ({ socketId, userId }: any) => {
          const pc = peerConnections.current.get(socketId);
          if (pc) {
            pc.close();
            peerConnections.current.delete(socketId);
          }
          setPeers((prev) => {
            const next = new Map(prev);
            const leavingPeer = next.get(socketId);
            if (leavingPeer) {
              toast.info(`${getUserName(leavingPeer.user)} left`);
            }
            next.delete(socketId);
            return next;
          });
        });

        socket.on('connect_error', () => {
          setConnectionStatus('error');
          toast.error('Voice gateway connection error. Retrying...');
        });
      } catch (err: any) {
        console.error('Media initialization failed:', err);
        setConnectionStatus('error');
        toast.error(err.message || 'Microphone/Camera permission required to join voice');
      }
    }

    initMediaAndConnect();

    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.emit('voice:leave', { channelId: channel._id });
        socketRef.current.disconnect();
      }
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [channel._id, channel.name, channel.type, currentUser, createPeerConnection, setupLocalVAD, signalingUrl]);

  // Toggle Microphone
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const muted = !audioTrack.enabled;
        setIsAudioMuted(muted);
        if (socketRef.current) {
          socketRef.current.emit('voice:media_toggle', {
            channelId: channel._id,
            isMuted: muted,
            isVideoOff: isVideoDisabled,
            isScreenSharing,
          });
        }
      }
    }
  };

  // Toggle Camera
  const toggleVideo = async () => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoDisabled(!videoTrack.enabled);
    } else {
      // Camera was not active, acquire video track
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        const newTrack = videoStream.getVideoTracks()[0];
        localStreamRef.current.addTrack(newTrack);

        // Add to all peer connections
        peerConnections.current.forEach((pc) => {
          pc.addTrack(newTrack, localStreamRef.current!);
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        setIsVideoDisabled(false);
      } catch (err) {
        toast.error('Could not access camera');
      }
    }
  };

  // Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Revert to camera
      if (localStreamRef.current) {
        const currentVideo = localStreamRef.current.getVideoTracks()[0];
        if (currentVideo) currentVideo.stop();
      }
      setIsScreenSharing(false);
      toggleVideo();
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          setIsScreenSharing(false);
        };

        // Replace track across peers
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          } else {
            pc.addTrack(screenTrack, screenStream);
          }
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);
        setIsVideoDisabled(false);
      } catch (err) {
        console.warn('Screen share canceled');
      }
    }
  };

  const peerList = Array.from(peers.values());
  const totalCount = peerList.length + 1;

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-white select-none">
      {/* Voice Stage Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#2b2d31] bg-[#2b2d31]/40 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-xl">{channel.type === 'video' ? '📹' : '🔊'}</span>
          <div>
            <h2 className="font-bold text-base text-gray-100 flex items-center gap-2">
              {channel.name}
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-normal flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                RTC Connected
              </span>
            </h2>
            <p className="text-xs text-gray-400">{channel.topic || 'Low-latency Opus Audio & Video Room'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-300 bg-[#1e1f22] px-3 py-1.5 rounded-md border border-[#35373c]">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>{totalCount} in Room</span>
          </div>
        </div>
      </div>

      {/* Media Grid */}
      <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center">
        <div
          className={`grid gap-4 w-full max-w-6xl transition-all duration-300 ${
            totalCount === 1
              ? 'grid-cols-1 max-w-xl'
              : totalCount === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : totalCount <= 4
              ? 'grid-cols-2'
              : totalCount <= 9
              ? 'grid-cols-2 md:grid-cols-3'
              : 'grid-cols-3 md:grid-cols-4'
          }`}
        >
          {/* Local User Card */}
          <div
            className={`relative aspect-video rounded-xl bg-[#2b2d31] overflow-hidden flex items-center justify-center border-2 transition-all duration-200 shadow-lg ${
              isSpeakingLocal
                ? 'border-emerald-500 shadow-emerald-500/20'
                : 'border-transparent hover:border-[#35373c]'
            }`}
          >
            {/* Video Stream */}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${isVideoDisabled && !isScreenSharing ? 'hidden' : 'block'}`}
            />

            {/* Avatar Placeholder when video is disabled */}
            {isVideoDisabled && !isScreenSharing && (
              <div className="flex flex-col items-center gap-3">
                <div className={`relative ${isSpeakingLocal ? 'scale-105' : ''} transition-transform duration-200`}>
                  <Avatar className="w-24 h-24 ring-4 ring-[#1e1f22]">
                    <AvatarImage src={getUserAvatar(currentUser)} />
                    <AvatarFallback className="bg-indigo-600 text-2xl font-bold">
                      {getUserName(currentUser).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isSpeakingLocal && (
                    <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full text-[10px]">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* User Overlay Badge */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-medium text-white">
              <span>{getUserName(currentUser)} (You)</span>
              {isAudioMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
            </div>
          </div>

          {/* Remote Peer Cards */}
          {peerList.map((peer) => (
            <RemotePeerTile key={peer.socketId} peer={peer} isDeafened={isDeafened} />
          ))}
        </div>
      </div>

      {/* Floating Control Dock */}
      <div className="p-4 flex items-center justify-center bg-[#111214] border-t border-[#2b2d31]">
        <div className="flex items-center gap-3 bg-[#232428] px-5 py-2.5 rounded-2xl border border-[#35373c] shadow-2xl">
          {/* Mute Button */}
          <Button
            size="icon"
            variant={isAudioMuted ? 'destructive' : 'secondary'}
            onClick={toggleAudio}
            className="w-12 h-12 rounded-full transition-transform active:scale-95"
            title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {/* Deafen Button */}
          <Button
            size="icon"
            variant={isDeafened ? 'destructive' : 'secondary'}
            onClick={() => setIsDeafened(!isDeafened)}
            className="w-12 h-12 rounded-full transition-transform active:scale-95"
            title={isDeafened ? 'Undeafen Audio' : 'Deafen (Mute Incoming Audio)'}
          >
            {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>

          {/* Camera Button */}
          <Button
            size="icon"
            variant={isVideoDisabled ? 'secondary' : 'default'}
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full transition-transform active:scale-95 ${
              !isVideoDisabled ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''
            }`}
            title={isVideoDisabled ? 'Turn On Camera' : 'Turn Off Camera'}
          >
            {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>

          {/* Screen Share Button */}
          <Button
            size="icon"
            variant={isScreenSharing ? 'default' : 'secondary'}
            onClick={toggleScreenShare}
            className={`w-12 h-12 rounded-full transition-transform active:scale-95 ${
              isScreenSharing ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <ScreenShare className="w-5 h-5" />
          </Button>

          <div className="w-px h-7 bg-[#35373c] mx-1" />

          {/* Disconnect Button */}
          <Button
            size="icon"
            variant="destructive"
            onClick={onDisconnect}
            className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-transform active:scale-95"
            title="Disconnect from Voice"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Subcomponent for Remote Peer Video/Audio Tile
const RemotePeerTile: React.FC<{ peer: PeerParticipant; isDeafened: boolean }> = ({ peer, isDeafened }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  const hasVideoTrack = peer.stream?.getVideoTracks().length && !peer.isVideoOff;
  const name = peer.user?.user_name || peer.user?.name || 'Anonymous Dev';
  const avatar = peer.user?.image || peer.user?.avatar || '';

  return (
    <div
      className={`relative aspect-video rounded-xl bg-[#2b2d31] overflow-hidden flex items-center justify-center border-2 transition-all duration-200 shadow-lg ${
        peer.isSpeaking
          ? 'border-emerald-500 shadow-emerald-500/20'
          : 'border-transparent hover:border-[#35373c]'
      }`}
    >
      {/* Remote Audio Track (automatically plays incoming audio) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isDeafened}
        className={`w-full h-full object-cover ${hasVideoTrack ? 'block' : 'hidden'}`}
      />

      {/* Avatar Placeholder when peer has no video */}
      {!hasVideoTrack && (
        <div className="flex flex-col items-center gap-3">
          <div className={`relative ${peer.isSpeaking ? 'scale-105' : ''} transition-transform duration-200`}>
            <Avatar className="w-24 h-24 ring-4 ring-[#1e1f22]">
              <AvatarImage src={avatar} />
              <AvatarFallback className="bg-emerald-700 text-2xl font-bold">
                {name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {peer.isSpeaking && (
              <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full text-[10px]">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Remote Peer Overlay Badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-medium text-white">
        <span>{name}</span>
        {peer.isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
      </div>
    </div>
  );
};
