'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Peer from 'peerjs';


const intents = ['hiring', 'looking_for_job', 'project_teammate'];

const VideoChat = () => {
  const [intent, setIntent] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [searching, setSearching] = useState(false);
  const [swiped, setSwiped] = useState(false);  // Track swipe action
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);


  const socketRef = useRef<any>(null);
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallRef = useRef<any>(null);

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
    if (intent) {
      // 1. Init socket and peer
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL as string , {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        withCredentials: true
      });
      socketRef.current = socket;

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

      // 2. Get user media
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // 3. When peer is ready, join queue
        peer.on('open', (id) => {
          setSearching(true);
          socket.emit('join_queue', { intent, peerId: id });
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
          });

          call.on('error', (error: any) => {
            console.error('Peer call error:', error);
          });
        };

        socket.on('queued', () => {
          setSearching(true);
          setConnected(false);
        });

        // 4. When match found
        socket.on('match_found', ({ peerId: remotePeerId, isInitiator }) => {
          console.log('Matched with', remotePeerId, 'initiator:', isInitiator);

          if (isInitiator) {
            const call = peer.call(remotePeerId, stream);
            bindCallEvents(call);
          }
        });

        // 5. Receiver
        peer.on('call', (call) => {
          call.answer(stream);
          bindCallEvents(call);
        });

        peer.on('error', (error) => {
          console.error('Peer error:', error);
        });

        // 6. Handle peer left
        socket.on('left', () => {
          if (activeCallRef.current) {
            activeCallRef.current.close();
            activeCallRef.current = null;
          }
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
          setConnected(false);
          setSearching(true);
          socket.emit('join_queue', { intent, peerId: peer.id });
        });

        socket.on('queue_error', (payload: { message: string }) => {
          console.error('Queue error:', payload?.message);
          setSearching(false);
        });
      });

      return () => {
        socket.disconnect();
        peer.destroy();

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
          localStreamRef.current = null;
        }
      };
    }
  }, [intent]);

  const handleSkip = () => {
    setSwiped(true);
  
    // Notify server you're skipping
    socketRef.current?.emit('skip');

    if (activeCallRef.current) {
      activeCallRef.current.close();
      activeCallRef.current = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  
    // Request rematch after swipe animation
    setTimeout(() => {
      setConnected(false);
      setSearching(true);
      setSwiped(false); // Reset animation state

      if (socketRef.current && peerRef.current?.id && intent) {
        socketRef.current.emit('join_queue', { intent, peerId: peerRef.current.id });
      }
    }, 500);
  };
  

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {!connected ? (
        <div className="flex gap-3">
          {intents.map((i) => (
            <button key={i} onClick={() => setIntent(i)} className="px-4 py-2 rounded bg-blue-600 text-white">
              {i.replace('_', ' ')}
            </button>
          ))}
          {searching && <p className="text-sm text-gray-500">Finding someone...</p>}
        </div>
      ) : (
        <>
          <div className={`flex gap-4 transition-transform duration-500 ${swiped ? 'transform translate-x-full opacity-0' : ''}`}>
            <video ref={localVideoRef} autoPlay muted playsInline className="w-48 h-36 bg-black rounded" />
            <video ref={remoteVideoRef} autoPlay playsInline className="w-48 h-36 bg-black rounded" />
          </div>
          <button
            onClick={handleSkip}
            className="mt-2 px-4 py-2 rounded bg-red-500 text-white transition-transform"
          >
            Skip
          </button>
        </>
      )}
    </div>
  );
};

export default VideoChat;
