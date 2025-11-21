const dgram = require('dgram');
const WebSocket = require('ws');

class RealMavlinkHandler {
  constructor() {
    this.telemetryData = {
      altitude: 0,
      speed: 0,
      latitude: 17.3850,
      longitude: 78.4867,
      battery: 100,
      heading: 0,
      mode: 'DISCONNECTED',
      armed: false,
      satellites: 0,
      groundSpeed: 0,
      voltage: 0,
      current: 0
    };
    this.telemetryClients = new Set();
    this.udpSocket = null;
    this.setupUDPListener();
  }

  setupUDPListener() {
    // Create UDP socket to listen for MAVLink messages
    this.udpSocket = dgram.createSocket('udp4');
    
    this.udpSocket.on('message', (msg, rinfo) => {
      try {
        this.parseMavlinkMessage(msg);
      } catch (error) {
        console.error('❌ MAVLink parse error:', error);
      }
    });

    this.udpSocket.on('listening', () => {
      const address = this.udpSocket.address();
      console.log(`📡 MAVLink UDP listener running on ${address.address}:${address.port}`);
    });

    this.udpSocket.on('error', (err) => {
      console.error('❌ MAVLink UDP error:', err);
    });

    // Bind to standard MAVLink port
    this.udpSocket.bind(14550);
  }

  parseMavlinkMessage(buffer) {
    // Simple MAVLink-like protocol parser
    // In real implementation, you'd use the mavlink library
    
    try {
      // For now, we'll parse our simulator's JSON format
      // This will be replaced with actual MAVLink binary parsing
      const message = buffer.toString();
      
      if (this.isJsonString(message)) {
        const data = JSON.parse(message);
        this.handleJsonTelemetry(data);
      } else {
        // Binary MAVLink message - placeholder for real implementation
        console.log('📦 Binary MAVLink message received (simulation mode)');
        this.handleBinaryMavlink(buffer);
      }
    } catch (error) {
      console.error('❌ MAVLink message parsing failed:', error);
    }
  }

  isJsonString(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  handleJsonTelemetry(data) {
    if (data.type === 'MAVLINK_SIM' || data.latitude) {
      console.log('📍 Received MAVLink telemetry via JSON');
      
      this.telemetryData = {
        altitude: data.altitude || this.telemetryData.altitude,
        speed: data.speed || this.telemetryData.speed,
        latitude: data.latitude || this.telemetryData.latitude,
        longitude: data.longitude || this.telemetryData.longitude,
        battery: data.battery || this.telemetryData.battery,
        heading: data.heading || this.telemetryData.heading,
        mode: data.mode || this.telemetryData.mode,
        armed: data.armed !== undefined ? data.armed : this.telemetryData.armed,
        satellites: data.satellites || data.gps?.sats || this.telemetryData.satellites,
        groundSpeed: data.groundSpeed || data.speed || this.telemetryData.groundSpeed,
        voltage: 10 + (data.battery / 100) * 4, // Simulate voltage
        current: 5 + Math.random() * 10, // Simulate current
        timestamp: new Date().toISOString()
      };

      this.broadcastTelemetry();
    }
  }

  handleBinaryMavlink(buffer) {
    // Placeholder for real MAVLink binary parsing
    // This would use the mavlink library to parse binary packets
    
    console.log('🔧 Binary MAVLink parsing would happen here');
    
    // Simulate some telemetry updates for demo
    this.telemetryData = {
      ...this.telemetryData,
      altitude: 50 + Math.random() * 50,
      latitude: 17.3850 + (Math.random() - 0.5) * 0.01,
      longitude: 78.4867 + (Math.random() - 0.5) * 0.01,
      battery: Math.max(20, this.telemetryData.battery - 0.1),
      heading: (this.telemetryData.heading + 2) % 360,
      timestamp: new Date().toISOString()
    };

    this.broadcastTelemetry();
  }

  // Method to send MAVLink commands to vehicle
  sendMavlinkCommand(command) {
    console.log(`🎮 Sending MAVLink command: ${command.type}`);
    
    // Create command packet (simplified)
    const commandPacket = {
      type: 'MAVLINK_COMMAND',
      command: command.type,
      params: command.params || {},
      timestamp: Date.now()
    };

    // Send via UDP (to simulator or real vehicle)
    if (this.udpSocket) {
      const message = Buffer.from(JSON.stringify(commandPacket));
      this.udpSocket.send(message, 14551, '127.0.0.1', (err) => {
        if (err) console.error('❌ Command send error:', err);
        else console.log(`✅ Command sent: ${command.type}`);
      });
    }
  }

  broadcastTelemetry() {
    const telemetryMessage = JSON.stringify({
      type: 'telemetry',
      data: this.telemetryData
    });

    let activeClients = 0;
    this.telemetryClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(telemetryMessage);
        activeClients++;
      }
    });

    if (activeClients > 0) {
      console.log(`📊 MAVLink telemetry sent to ${activeClients} clients`);
    }
  }

  addClient(ws) {
    this.telemetryClients.add(ws);
    console.log(`➕ Added MAVLink client. Total: ${this.telemetryClients.size}`);
    
    // Send current telemetry immediately
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'telemetry',
        data: this.telemetryData
      }));
    }
  }

  removeClient(ws) {
    this.telemetryClients.delete(ws);
    console.log(`➖ Removed MAVLink client. Total: ${this.telemetryClients.size}`);
  }

  // Cleanup
  destroy() {
    if (this.udpSocket) {
      this.udpSocket.close();
    }
    console.log('🧹 Real MAVLink handler destroyed');
  }
}

module.exports = RealMavlinkHandler;