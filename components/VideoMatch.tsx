'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Peer from 'peerjs';
import { getSession } from 'next-auth/react';

const intents = ['hiring', 'looking_for_job', 'project_teammate'];

const VideoChat = () => {
  const [intent, setIntent] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [searching, setSearching] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        setUserId(session.user._id);
        console.log('User ID:', session.user._id);
      } else {
        console.log('No session found');
      }
    });
  }, []);

  const socketRef = useRef<any>(null);
  const peerRef = useRef<Peer | null>(null);
  const activeCallRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingPeerIdRef = useRef<string | null>(null);
  const fallbackCallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerReadyIdRef = useRef<string | null>(null);

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
      {
        urls: stunUrl,
      },
      {
        urls: turnUrl,
        username,
        credential,
      },
      {
        urls: turnTcpUrl,
        username,
        credential,
      },
      {
        urls: turn443Url,
        username,
        credential,
      },
      {
        urls: turns443TcpUrl,
        username,
        credential,
      },
    ];
  };

  useEffect(() => {
    if (intent && userId) {
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL as string, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
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

      const peer = new Peer(`${userId}-${Math.random().toString(36).slice(2, 10)}`, {
        host: process.env.NEXT_PUBLIC_PEER_SERVER_HOST || "peer-server-zr5n.onrender.com",
        port: Number(process.env.NEXT_PUBLIC_PEER_SERVER_PORT || 443),
        path: process.env.NEXT_PUBLIC_PEER_SERVER_PATH || "/peerjs",
        secure: true,
        config: {
          iceServers: getIceServers(),
        },
      });

      peerRef.current = peer;

      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        peer.on('open', (id) => {
          peerReadyIdRef.current = id;
          joinQueueIfReady();
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
            setConnected(false);
            setSearching(true);
            activeCallRef.current = null;
          });

          call.on('error', (error: any) => {
            console.error('Peer call error:', error);
          });
        };

        socket.on('queued', () => {
          setSearching(true);
          setConnected(false);
        });

        socket.on('match_found', ({ peerId: remotePeerId, isInitiator }) => {
          console.log('Matched with', remotePeerId);
          pendingPeerIdRef.current = remotePeerId;

          if (isInitiator && !activeCallRef.current) {
            const call = peer.call(remotePeerId, stream);
            bindCallEvents(call);
          } else if (!isInitiator) {
            if (fallbackCallTimerRef.current) {
              clearTimeout(fallbackCallTimerRef.current);
            }

            fallbackCallTimerRef.current = setTimeout(() => {
              if (!activeCallRef.current && pendingPeerIdRef.current) {
                const fallbackCall = peer.call(pendingPeerIdRef.current, stream);
                bindCallEvents(fallbackCall);
              }
            }, 1500);
          }
        });

        peer.on('call', (call) => {
          call.answer(stream);
          bindCallEvents(call);
        });

        peer.on('error', (error) => {
          console.error('Peer error:', error);
        });

        peer.on('disconnected', () => {
          console.warn('Peer disconnected from signaling server. Reconnecting...');
          if (!peer.destroyed) {
            peer.reconnect();
          }
        });

        socket.on('left', () => {
          if (activeCallRef.current) {
            activeCallRef.current.close();
            activeCallRef.current = null;
          }
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
          setConnected(false);
          joinQueueIfReady();
        });

        socket.on('queue_error', (payload: { message: string }) => {
          console.error('Queue error:', payload?.message);
          setSearching(true);
          setTimeout(() => {
            joinQueueIfReady();
          }, 800);
        });
      }).catch((error) => {
        console.error('Failed to get camera/mic:', error);
        setSearching(false);
      });

      return () => {
        if (fallbackCallTimerRef.current) {
          clearTimeout(fallbackCallTimerRef.current);
          fallbackCallTimerRef.current = null;
        }

        socket.disconnect();
        peer.destroy();

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
          localStreamRef.current = null;
        }
      };
    }
  }, [intent, userId]);

  const handleSkip = () => {
    if (!connected) {
      socketRef.current?.emit('skip');
      setSearching(false);
      setIntent(null);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      return;
    }

    socketRef.current?.emit('skip');
    window.location.reload();
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {!intent ? (
        <div className="flex gap-3">
          {intents.map((i) => (
            <button key={i} onClick={() => setIntent(i)} className="px-4 py-2 rounded bg-blue-600 text-white">
              {i.replace('_', ' ')}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="flex gap-4">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-48 h-36 bg-black rounded" />
            <video ref={remoteVideoRef} autoPlay playsInline className="w-48 h-36 bg-black rounded" />
          </div>
          {searching && <p className="text-sm text-gray-500">Finding someone...</p>}
          {!connected && !searching && <p className="text-sm text-gray-500">Waiting for connection...</p>}
          <button onClick={handleSkip} className="mt-2 px-4 py-2 rounded bg-red-500 text-white">
            {connected ? 'Skip' : 'Cancel'}
          </button>
        </>
      )}
    </div>
  );
};

export default VideoChat;
