/**
 * Unified WebRTC & Signaling Helpers (web/lib/webrtc-utils.ts)
 * Centralizes STUN/TURN, Socket.IO gateway, and PeerJS connection topologies.
 */

export function getIceServers(): RTCIceServer[] {
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
}

export function getSocketServerUrl(): string {
  return process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'https://nerdshive-socket-server.onrender.com';
}

export function getPeerServerConfig() {
  return {
    host: process.env.NEXT_PUBLIC_PEER_SERVER_HOST || 'peer-server-zr5n.onrender.com',
    port: Number(process.env.NEXT_PUBLIC_PEER_SERVER_PORT || 443),
    path: process.env.NEXT_PUBLIC_PEER_SERVER_PATH || '/peerjs',
    secure: true,
    config: {
      iceServers: getIceServers(),
    },
  };
}
