const WebSocket = require('ws');

const wss = new WebSocket.Server({ 
  port: 8081,
  host: '0.0.0.0' // Allow connections from any host
});

console.log('✅ WebRTC signaling server starting on port 8081...');

const clients = new Map();

wss.on('connection', (ws, request) => {
  console.log('🔗 New WebSocket connection from:', request.socket.remoteAddress);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received message:', data);
      
      // Store client role
      if (data.role) {
        clients.set(ws, data.role);
        console.log(`👤 Client registered as: ${data.role}`);
      }

      // Relay messages to the other client
      clients.forEach((role, client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          console.log(`🔄 Relaying message from ${clients.get(ws)} to ${role}`);
          client.send(JSON.stringify(data));
        }
      });
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    const role = clients.get(ws);
    console.log(`❌ Client disconnected (${role})`);
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('💥 WebSocket error:', error);
  });
});

wss.on('error', (error) => {
  console.error('💥 WebSocket server error:', error);
});

wss.on('listening', () => {
  console.log('🎯 WebRTC signaling server is now listening on port 8081');
  console.log('📍 Connect via: ws://localhost:8081');
});