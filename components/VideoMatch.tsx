'use client';

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Peer from 'peerjs';

const intents = ['hiring', 'looking_for_job', 'project_teammate'];

const VideoChat = () => {
  const [intent, setIntent] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const socketRef = useRef<any>(null);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    if (intent) {
      // 1. Init socket and peer
      const socket = io({
        path: '/api/socket_io',
      });
      socketRef.current = socket;

      const peer = new Peer();
      peerRef.current = peer;

      // 2. Get user media
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // 3. When peer is ready, join queue
        peer.on('open', (id) => {
          socket.emit('join_queue', { intent });
        });

        // 4. When match found
        socket.on('match_found', ({ peerId }) => {
          console.log('Matched with', peerId);

          // Caller
          const call = peer.call(peerId, stream);
          call.on('stream', (remoteStream) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          });
        });

        // 5. Receiver
        peer.on('call', (call) => {
          call.answer(stream);
          call.on('stream', (remoteStream) => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          });
        });

        // 6. Handle peer left
        socket.on('left', () => {
          alert('User left. Searching again...');
          window.location.reload();
        });
      });

      setConnected(true);
    }
  }, [intent]);

  const handleSkip = () => {
    socketRef.current?.emit('skip');
    window.location.reload();
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
        </div>
      ) : (
        <>
          <div className="flex gap-4">
            <video ref={localVideoRef} autoPlay muted className="w-48 h-36 bg-black rounded" />
            <video ref={remoteVideoRef} autoPlay className="w-48 h-36 bg-black rounded" />
          </div>
          <button onClick={handleSkip} className="mt-2 px-4 py-2 rounded bg-red-500 text-white">
            Skip
          </button>
        </>
      )}
    </div>
  );
};

export default VideoChat;
