const { ExpressPeerServer } = require('peer');
const express = require('express');
const app = express();

app.set('trust proxy', 1);

// Setting the port dynamically or defaulting to 10000
const PORT = process.env.PORT || 10000;

// Basic route to check if the server is running
app.get('/', (req, res) => res.send("PeerJS Server Running"));

// Start the Express server
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Initialize the PeerJS server on the existing Express server
const peerServer = ExpressPeerServer(server, {
  path: '/',
  debug: process.env.NODE_ENV !== 'production',
  allow_discovery: false,
  proxied: true,
  pingInterval: Number(process.env.PEER_PING_INTERVAL || 5000),
});

app.use('/peerjs', peerServer);

// Optional: Add logging to monitor any issues or errors
peerServer.on('connection', (client) => {
  console.log('New Peer connected:', client.id);
});

peerServer.on('disconnect', (client) => {
  console.log('Peer disconnected:', client.id);
});

peerServer.on('error', (error) => {
  console.error('Peer server error:', error);
});
