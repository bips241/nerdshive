'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Peer from 'peerjs';
import { Mic, MicOff, Video, VideoOff, ScreenShare, UserPlus, SkipForward, RefreshCw, Code2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const intents = [
  { id: 'hiring', label: 'Hiring / Recruiting', color: 'bg-emerald-600 hover:bg-emerald-700' },
  { id: 'looking_for_job', label: 'Looking for Opportunities', color: 'bg-blue-600 hover:bg-blue-700' },
  { id: 'project_teammate', label: 'Hackathon / Project Teammate', color: 'bg-purple-600 hover:bg-purple-700' },
];

const CODE_TEMPLATES: { [key: string]: string } = {
  typescript: `// TypeScript Pair Programming Scratchpad\nfunction solveProblem(input: string[]): string {\n  return input.join(', ');\n}\n\nconsole.log(solveProblem(['Hello', 'DevConnect']));\n`,
  javascript: `// JavaScript Live Scratchpad\nfunction twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) return [map.get(complement), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}\n`,
  python: `# Python Pair Programming Scratchpad\ndef fibonacci(n: int) -> list[int]:\n    res = [0, 1]\n    for i in range(2, n):\n        res.append(res[-1] + res[-2])\n    return res[:n]\n\nprint(fibonacci(10))\n`,
  rust: `// Rust Scratchpad\nfn main() {\n    let devs = vec!["Rustacean", "FullStack", "Gopher"];\n    println!("Matched devs: {:?}", devs);\n}\n`,
  go: `// Go Scratchpad\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Happy hacking on NerdShive!")\n}\n`,
};

const VideoChat = () => {
  const [intent, setIntent] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [searching, setSearching] = useState(false);
  const [swiped, setSwiped] = useState(false);

  // In-call media controls
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [lastPartnerPeerId, setLastPartnerPeerId] = useState<string | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);

  // In-call Pair Programming Scratchpad
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('typescript');
  const [codeContent, setCodeContent] = useState(CODE_TEMPLATES.typescript);
  const [copiedCode, setCopiedCode] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const socketRef = useRef<any>(null);
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const activeCallRef = useRef<any>(null);
  const pendingPeerIdRef = useRef<string | null>(null);
  const fallbackCallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerReadyIdRef = useRef<string | null>(null);
  const queueAckedRef = useRef(false);
  const queueRetryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getIceServers = () => {
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
  };

  useEffect(() => {
    if (intent) {
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL as string, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        withCredentials: true,
      });
      socketRef.current = socket;

      const joinQueueIfReady = () => {
        if (!intent || !peerReadyIdRef.current || !socket.connected) return;
        setSearching(true);
        socket.emit('join_queue', { intent, peerId: peerReadyIdRef.current });
      };

      socket.on('connect', () => {
        joinQueueIfReady();
      });

      socket.on('queued', () => {
        queueAckedRef.current = true;
        setSearching(true);
        setConnected(false);
      });

      socket.on('match_found', ({ peerId: remotePeerId, isInitiator }) => {
        console.log('Matched with', remotePeerId, 'initiator:', isInitiator);
        queueAckedRef.current = true;
        pendingPeerIdRef.current = remotePeerId;
        setLastPartnerPeerId(remotePeerId);
        setShowConnectDialog(false);

        if (isInitiator && !activeCallRef.current && localStreamRef.current) {
          const call = peerRef.current!.call(remotePeerId, localStreamRef.current);
          bindCallEvents(call);
        } else if (!isInitiator) {
          if (fallbackCallTimerRef.current) {
            clearTimeout(fallbackCallTimerRef.current);
          }

          fallbackCallTimerRef.current = setTimeout(() => {
            if (!activeCallRef.current && pendingPeerIdRef.current && localStreamRef.current) {
              const fallbackCall = peerRef.current!.call(pendingPeerIdRef.current, localStreamRef.current);
              bindCallEvents(fallbackCall);
            }
          }, 1500);
        }
      });

      socket.on('left', () => {
        if (activeCallRef.current) {
          activeCallRef.current.close();
          activeCallRef.current = null;
        }
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        setConnected(false);
        queueAckedRef.current = false;
        setShowConnectDialog(true);
        joinQueueIfReady();
      });

      socket.on('queue_error', (payload: { message: string }) => {
        console.error('Queue error:', payload?.message);
        queueAckedRef.current = false;
        setSearching(true);
        setTimeout(() => {
          joinQueueIfReady();
        }, 800);
      });

      const bindCallEvents = (call: any) => {
        activeCallRef.current = call;

        call.on('stream', (remoteStream: MediaStream) => {
          setConnected(true);
          setSearching(false);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        });

        call.on('close', () => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
          activeCallRef.current = null;
          setConnected(false);
          setSearching(true);
          setShowConnectDialog(true);
        });

        call.on('error', (error: any) => {
          console.error('Peer call error:', error);
        });
      };

      const peerId = `${Math.random().toString(36).slice(2, 10)}`;
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
      peerReadyIdRef.current = peerId;
      queueAckedRef.current = false;
      joinQueueIfReady();

      if (queueRetryTimerRef.current) {
        clearInterval(queueRetryTimerRef.current);
      }
      queueRetryTimerRef.current = setInterval(() => {
        if (!queueAckedRef.current && !connected) {
          joinQueueIfReady();
        }
      }, 1200);

      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStreamRef.current = stream;
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;

          peer.on('open', (id) => {
            peerReadyIdRef.current = id;
            joinQueueIfReady();
          });

          peer.on('call', (call) => {
            call.answer(stream);
            bindCallEvents(call);
          });

          peer.on('error', (error) => {
            console.error('Peer error:', error);
          });

          peer.on('disconnected', () => {
            if (!peer.destroyed) {
              peer.reconnect();
            }
          });
        })
        .catch((error) => {
          console.error('Failed to get camera/mic:', error);
          toast.error('Could not access camera or microphone.');
          setSearching(false);
        });

      return () => {
        if (fallbackCallTimerRef.current) {
          clearTimeout(fallbackCallTimerRef.current);
          fallbackCallTimerRef.current = null;
        }

        if (queueRetryTimerRef.current) {
          clearInterval(queueRetryTimerRef.current);
          queueRetryTimerRef.current = null;
        }

        socket.disconnect();
        peer.destroy();

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
          localStreamRef.current = null;
        }
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop());
          screenStreamRef.current = null;
        }
      };
    }
  }, [intent]);

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
    if (!connected || !activeCallRef.current) {
      toast.info('Connect with a peer before sharing screen');
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
        const sender = activeCallRef.current.peerConnection
          ?.getSenders()
          ?.find((s: any) => s.track?.kind === 'video');
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
        const sender = activeCallRef.current.peerConnection
          ?.getSenders()
          ?.find((s: any) => s.track?.kind === 'video');
        if (sender && screenTrack) {
          sender.replaceTrack(screenTrack);
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
        toast.success('Sharing screen with peer');
      } catch (err) {
        console.error('Screen sharing error:', err);
      }
    }
  };

  const handleLanguageChange = (lang: string) => {
    setCodeLanguage(lang);
    if (CODE_TEMPLATES[lang]) {
      setCodeContent(CODE_TEMPLATES[lang]);
    }
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(codeContent);
    setCopiedCode(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSkip = () => {
    if (!connected) {
      socketRef.current?.emit('skip');
      setSearching(false);
      setIntent(null);
      setSwiped(false);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      return;
    }

    setSwiped(true);
    socketRef.current?.emit('skip');

    if (activeCallRef.current) {
      activeCallRef.current.close();
      activeCallRef.current = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setShowConnectDialog(true);

    setTimeout(() => {
      setConnected(false);
      setSearching(true);
      setSwiped(false);

      if (socketRef.current && peerRef.current?.id && intent) {
        setSearching(true);
        socketRef.current.emit('join_queue', { intent, peerId: peerRef.current.id });
      }
    }, 500);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 max-w-5xl mx-auto">
      {!intent ? (
        <div className="flex flex-col items-center text-center space-y-6 py-12">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Stranger Video Chat for Developers</h1>
            <p className="text-muted-foreground mt-2 max-w-lg">
              Match randomly with developers, founders, and recruiters based on intent. Code, brainstorm, or pair program live.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            {intents.map((i) => (
              <Button
                key={i.id}
                onClick={() => setIntent(i.id)}
                className={`px-6 py-6 text-base font-semibold shadow-lg text-white ${i.color}`}
              >
                {i.label}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center space-y-6">
          {/* Header Status */}
          <div className="flex items-center justify-between w-full px-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Mode: <span className="text-foreground capitalize">{intent.replace(/_/g, ' ')}</span>
            </span>
            <span className="flex items-center gap-2 text-xs">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {connected ? 'Connected' : searching ? 'Finding partner...' : 'Waiting for queue...'}
            </span>
          </div>

          {/* Main Layout: Video Frames (+ Optional Live Code Scratchpad) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
            {/* Video Streams Container */}
            <div className={`${showScratchpad ? 'lg:col-span-6' : 'lg:col-span-12'} flex flex-col gap-4 transition-all duration-300`}>
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 w-full transition-transform duration-500 ${swiped ? 'transform translate-x-full opacity-0' : ''}`}>
                {/* Local Video */}
                <div className="relative aspect-video bg-neutral-900 rounded-xl overflow-hidden shadow-md border border-border">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded backdrop-blur-sm">
                    You {isScreenSharing && '(Screen)'}
                  </span>
                </div>

                {/* Remote Video */}
                <div className="relative aspect-video bg-neutral-900 rounded-xl overflow-hidden shadow-md border border-border flex items-center justify-center">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!connected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-neutral-900/80">
                      <RefreshCw className="h-8 w-8 text-primary animate-spin mb-2" />
                      <p className="text-sm font-medium text-white">Looking for a matching developer...</p>
                    </div>
                  )}
                  {connected && (
                    <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded backdrop-blur-sm">
                      Partner
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Pair Programming Code Scratchpad */}
            {showScratchpad && (
              <div className="lg:col-span-6 flex flex-col bg-card border rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-bold">Pair Programming Scratchpad</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={codeLanguage} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="h-8 w-32 text-xs">
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

                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyCodeToClipboard}>
                      {copiedCode ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  className="w-full h-64 font-mono text-xs p-3 rounded-xl bg-neutral-950 text-emerald-400 border focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none"
                  spellCheck={false}
                />
                <p className="text-[11px] text-muted-foreground">
                  💡 Type or paste code snippets to discuss architecture, algorithms, or debug collaboratively.
                </p>
              </div>
            )}
          </div>

          {/* In-Call Media & Action Bar */}
          <div className="flex items-center gap-3 bg-card border rounded-full px-5 py-2.5 shadow-lg">
            <Button
              variant={isAudioMuted ? 'destructive' : 'secondary'}
              size="icon"
              className="rounded-full h-10 w-10"
              onClick={toggleAudio}
            >
              {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>

            <Button
              variant={isVideoDisabled ? 'destructive' : 'secondary'}
              size="icon"
              className="rounded-full h-10 w-10"
              onClick={toggleVideo}
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
              variant={showScratchpad ? 'default' : 'secondary'}
              size="icon"
              className="rounded-full h-10 w-10"
              onClick={() => setShowScratchpad(!showScratchpad)}
              title="Pair Programming Scratchpad"
            >
              <Code2 className="h-4 w-4" />
            </Button>

            <Button
              variant="destructive"
              className="rounded-full px-5 gap-1.5 font-semibold"
              onClick={handleSkip}
            >
              <SkipForward className="h-4 w-4" />
              {connected ? 'Next Match' : 'Leave Queue'}
            </Button>
          </div>

          {/* Post-Match Teammate Connection Banner */}
          {showConnectDialog && lastPartnerPeerId && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 max-w-md w-full flex items-center justify-between shadow-sm animate-in fade-in">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Enjoyed the conversation?</p>
                <p className="text-xs text-muted-foreground">Send a follow request to connect as teammates.</p>
              </div>
              <Button
                size="sm"
                className="gap-1 font-semibold"
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
};

export default VideoChat;
