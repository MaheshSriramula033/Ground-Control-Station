const WebSocket = require('ws');
const RealMavlinkHandler = require('./real-mavlink-handler');

// WebRTC signaling server (port 8081)
const signalingServer = new WebSocket.Server({ port: 8081 });
console.log('🎯 WebRTC Signaling Server running on port 8081');

// Telemetry server (port 8082)
const telemetryServer = new WebSocket.Server({ port: 8082 });
console.log('📡 Telemetry Server running on port 8082');

// Command server (port 8083)
const commandServer = new WebSocket.Server({ port: 8083 });
console.log('🎮 Command Server running on port 8083');

// Initialize REAL MAVLink handler (replaces simulation)
const mavlinkHandler = new RealMavlinkHandler();
console.log('🚀 REAL MAVLink Handler initialized - Listening on UDP 14550');

// WebRTC signaling logic (existing)
const clients = new Map();
signalingServer.on('connection', (ws) => {
  console.log('🔗 New WebRTC connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.role) {
        clients.set(ws, data.role);
        console.log(`👤 Client registered as: ${data.role}`);
      }

      clients.forEach((role, client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
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
});

// Telemetry broadcast logic
telemetryServer.on('connection', (ws) => {
  console.log('📊 New telemetry client connected');
  mavlinkHandler.addClient(ws);
  
  ws.on('close', () => {
    console.log('📊 Telemetry client disconnected');
    mavlinkHandler.removeClient(ws);
  });
  
  ws.on('error', (error) => {
    console.error('📊 Telemetry WebSocket error:', error);
  });
});

// Command handling logic
commandServer.on('connection', (ws) => {
  console.log('🎮 New command client connected');
  
  ws.on('message', (message) => {
    try {
      const command = JSON.parse(message);
      console.log(`📨 Received command: ${command.type}`);
      
      // Send command to MAVLink handler
      mavlinkHandler.sendMavlinkCommand(command);
      
      // Acknowledge command
      ws.send(JSON.stringify({
        type: 'command_ack',
        command: command.type,
        status: 'ACCEPTED',
        timestamp: new Date().toISOString()
      }));
      
    } catch (error) {
      console.error('❌ Command parsing error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid command format'
      }));
    }
  });

  ws.on('close', () => {
    console.log('🎮 Command client disconnected');
  });

  ws.on('error', (error) => {
    console.error('🎮 Command WebSocket error:', error);
  });
});

console.log('🚀 GCS Backend services started successfully!');
console.log('   - WebRTC Signaling: ws://localhost:8081');
console.log('   - Telemetry: ws://localhost:8082');
console.log('   - Commands: ws://localhost:8083');
console.log('   - MAVLink UDP: udp://localhost:14550');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down GCS backend...');
  mavlinkHandler.destroy();
  process.exit(0);
});