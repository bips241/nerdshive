# Nerd'sHive WebRTC Peer Server (`apps/peer-server`)

> **Package**: `@nerdshive/peer-server`  
> **Runtime**: Node.js / Express + PeerJS Server (`peer`)  
> **Default Port**: `9000` (Path: `/peerjs`)

---

## 1. Overview & Purpose

The `peer-server` package provides WebRTC signaling and ID exchange for peer-to-peer audio, video, and data channels across the Nerd'sHive platform:
- **Pair Radar**: WebRTC video, audio, screen share, and collaborative data channel synchronizations (Hackathon Pitch Canvas & Code Scratchpad).
- **Squad Voice & Video Lounges**: Multi-party WebRTC audio and video streaming in private squad Discord servers (`voice:pair-hacking`).
- **Direct 1-on-1 Calls**: P2P direct calling between connected developers in `/dashboard/messages`.

---

## 2. Configuration & Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Local listen port | `9000` |
| `PATH` | PeerJS mount path | `/peerjs` |
| `NEXT_PUBLIC_PEER_SERVER_HOST` | Frontend peer connection host | `localhost` or public domain |
| `NEXT_PUBLIC_PEER_SERVER_PORT` | Frontend peer connection port | `9000` or `443` (behind Nginx/SSL) |

---

## 3. Operational Commands

```bash
# Start peer server locally
npm run start --prefix apps/peer-server

# Or via monorepo root
npm run start:peer
```

---

## 4. Production & Reverse Proxy Routing

In production, the Nginx reverse proxy terminates SSL and proxies `/peerjs/` directly to the `peer-server` container:

```nginx
location /peerjs/ {
    proxy_pass http://127.0.0.1:9000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```
