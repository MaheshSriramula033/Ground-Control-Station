const WebSocket = require('ws');

class MavlinkHandler {
  constructor() {
    this.telemetryData = {
      altitude: 0,
      speed: 0,
      latitude: 37.7749,
      longitude: -122.4194,
      battery: 100,
      heading: 0,
      mode: 'DISCONNECTED',
      armed: false,
      satellites: 0,
      groundSpeed: 0
    };
    this.telemetryClients = new Set();
    this.simulationInterval = null;
    this.useSimulatorData = false;
  }

  initialize() {
    console.log('🚀 MAVLink Handler Initializing...');
    
    // Start simulation as fallback
    this.startTelemetryBroadcast();
    console.log('✅ MAVLink Handler Ready - Simulation mode active');
  }

  startTelemetryBroadcast() {
    // Clear any existing interval
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    
    // Simulate telemetry updates (fallback)
    this.simulationInterval = setInterval(() => {
      if (!this.useSimulatorData) {
        this.updateTelemetry();
      }
    }, 1000);
  }

  updateTelemetry() {
    try {
      // Simulate realistic telemetry data
      const newBattery = Math.max(20, Math.min(100, this.telemetryData.battery - 0.5));
      
      this.telemetryData = {
        altitude: 50 + Math.random() * 50,
        speed: 8 + Math.random() * 10,
        latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
        longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
        battery: parseFloat(newBattery.toFixed(1)),
        heading: (this.telemetryData.heading + 2) % 360,
        mode: ['STABILIZE', 'ALT_HOLD', 'LOITER', 'GUIDED'][Math.floor(Math.random() * 4)],
        armed: Math.random() > 0.3,
        satellites: 8 + Math.floor(Math.random() * 8),
        groundSpeed: 5 + Math.random() * 8,
        timestamp: new Date().toISOString()
      };

      console.log('📊 Broadcasting SIMULATED telemetry');
      this.broadcastTelemetry();
    } catch (error) {
      console.error('❌ Error updating telemetry:', error);
    }
  }

  // New method to handle telemetry from external simulator
  broadcastCustomTelemetry(customData) {
    try {
      this.useSimulatorData = true;
      
      this.telemetryData = {
        ...this.telemetryData,
        ...customData
      };

      console.log('📊 Broadcasting REAL telemetry from simulator');
      this.broadcastTelemetry();
    } catch (error) {
      console.error('❌ Error broadcasting custom telemetry:', error);
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
      console.log(`📨 Sent telemetry to ${activeClients} clients - Battery: ${this.telemetryData.battery.toFixed(1)}%`);
    }
  }

  addClient(ws) {
    this.telemetryClients.add(ws);
    console.log(`➕ Added telemetry client. Total: ${this.telemetryClients.size}`);
    
    // Send current telemetry immediately to new client
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'telemetry',
        data: this.telemetryData
      }));
      console.log('📤 Sent initial telemetry to new client');
    }
  }

  removeClient(ws) {
    this.telemetryClients.delete(ws);
    console.log(`➖ Removed telemetry client. Total: ${this.telemetryClients.size}`);
  }

  destroy() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    console.log('🧹 MAVLink Handler destroyed');
  }
}

module.exports = MavlinkHandler;