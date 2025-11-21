// backend/enhanced-server.js
const RealMavlinkHandler = require('./real-mavlink-handler');
const ZeroTierManager = require('./zerotier-manager');
const NetworkManager = require('./network-manager');
const LTEModem = require('./lte-modem');
const NetworkSwitcher = require('./network-switcher');

class EnhancedGCSServer {
  // Accept wsServers object so we can work in single port environment
  constructor(wsServers = {}) {
    this.zerotier = new ZeroTierManager();
    this.networkManager = new NetworkManager();
    this.lteModem = new LTEModem();
    this.networkSwitcher = null;
    this.mavlinkHandler = new RealMavlinkHandler();
    this.remoteAccessEnabled = false;
    this.config = {
      zerotierNetwork: process.env.ZEROTIER_NETWORK_ID || '8056c2e21c000001',
      ports: {
        web: process.env.PORT || 3000,
        mavlink: process.env.MAVLINK_UDP_PORT || 14550
      }
    };

    // these are the WS servers created by ws-server.js
    this.wssSignaling = wsServers.wssSignaling;
    this.wssTelemetry  = wsServers.wssTelemetry;
    this.wssCommands   = wsServers.wssCommands;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Enhanced GCS Server...');

      // Attach WS handlers (instead of creating new servers on ports)
      this.setupServers();

      // Initialize network management
      await this.initializeNetworkManagement();

      // Initialize remote access
      await this.initializeRemoteAccess();

      console.log('✅ Enhanced GCS Server initialized successfully!');

    } catch (error) {
      console.error('❌ Enhanced server initialization failed:', error.message || error);
      this.fallbackToLocalMode();
    }
  }

  async initializeNetworkManagement() {
    try {
      console.log('📶 Setting up network management...');
      const networkStatus = await this.networkManager.initialize();
      console.log(`📡 Current network: ${networkStatus.current.type} - ${networkStatus.current.address}`);
      const lteStatus = await this.lteModem.initialize();
      console.log(`📱 LTE Status: ${lteStatus.connected ? 'Connected' : 'Disconnected'} - ${lteStatus.signalStrength}%`);
      this.networkSwitcher = new NetworkSwitcher(this.networkManager, this.lteModem);
      await this.networkSwitcher.initialize();
      this.startNetworkBroadcasting();
    } catch (error) {
      console.error('❌ Network management initialization failed:', error);
    }
  }

  async initializeRemoteAccess() {
    try {
      console.log('🌐 Setting up remote access via ZeroTier...');
      const ztInfo = await this.zerotier.initialize(this.config.zerotierNetwork);
      if (ztInfo.status !== 'connected') {
        await this.zerotier.waitForConnection(30000);
      }
      this.remoteAccessEnabled = true;
      const finalInfo = this.zerotier.getConnectionInfo();
      this.displayAccessInfo(finalInfo);
    } catch (error) {
      console.warn('⚠️  Remote access unavailable:', error.message || error);
      this.fallbackToLocalMode();
    }
  }

  startNetworkBroadcasting() {
    setInterval(() => {
      const networkStatus = {
        type: 'network_status',
        data: {
          network: this.networkManager.getNetworkStatus(),
          lte: this.lteModem.getStatus(),
          switching: this.networkSwitcher ? this.networkSwitcher.getStatus() : null,
          timestamp: new Date().toISOString()
        }
      };
      this.broadcastToTelemetryClients(networkStatus);
    }, 10000);
  }

  broadcastToTelemetryClients(message) {
    const messageStr = JSON.stringify(message);
    if (!this.wssTelemetry) return;
    let sent = 0;
    this.wssTelemetry.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(messageStr);
        sent++;
      }
    });
    if (sent > 0) console.log(`📊 Broadcast network status to ${sent} telemetry clients`);
  }

  displayAccessInfo(ztInfo) {
    const ports = this.config.ports;
    if (ztInfo.assignedIp) {
      console.log('\n📍 REMOTE ACCESS URLs:');
      console.log(`   GCS Dashboard:    http://${ztInfo.assignedIp}:${ports.web}`);
      console.log(`   Telemetry:        ws://${ztInfo.assignedIp}:${ports.web}/ws/telemetry`);
      console.log(`   Commands:         ws://${ztInfo.assignedIp}:${ports.web}/ws/commands`);
      console.log(`   Video Signaling:  ws://${ztInfo.assignedIp}:${ports.web}/ws/signaling`);
      console.log(`   MAVLink:          udp://${ztInfo.assignedIp}:${ports.mavlink}`);
    }
    console.log('\n📍 LOCAL ACCESS URLs:');
    console.log(`   GCS Dashboard:    http://localhost:${ports.web}`);
    console.log(`   Telemetry:        ws://localhost:${ports.web}/ws/telemetry`);
    console.log(`   Commands:         ws://localhost:${ports.web}/ws/commands`);
    console.log(`   Video Signaling:  ws://localhost:${ports.web}/ws/signaling`);
    console.log(`   MAVLink:          udp://localhost:${ports.mavlink}`);
    console.log('');
    if (ztInfo.simulation) {
      console.log('💡 NOTE: Running in simulation mode. Install ZeroTier for real remote access.');
    }
  }

  setupServers() {
    // Ensure ws servers are provided
    if (!this.wssSignaling || !this.wssTelemetry || !this.wssCommands) {
      throw new Error('Missing WebSocket servers. Provide wssSignaling, wssTelemetry and wssCommands in constructor.');
    }

    // Signaling handlers
    const clients = new Map();
    this.wssSignaling.on('connection', (ws, req) => {
      console.log('🔗 New WebRTC connection');
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.role) clients.set(ws, data.role);
          clients.forEach((role, client) => {
            if (client !== ws && client.readyState === 1) {
              client.send(JSON.stringify(data));
            }
          });
        } catch (error) {
          console.error('❌ Signaling error:', error);
        }
      });
      ws.on('close', () => {
        const role = clients.get(ws);
        console.log(`🔗 WebRTC client disconnected (${role})`);
        clients.delete(ws);
      });
    });

    // Telemetry handlers
    this.wssTelemetry.on('connection', (ws) => {
      console.log('📊 New telemetry client connected');
      this.mavlinkHandler.addClient(ws);
      // Send initial status
      const init = {
        type: 'network_status',
        data: {
          network: this.networkManager.getNetworkStatus(),
          lte: this.lteModem.getStatus(),
          switching: this.networkSwitcher ? this.networkSwitcher.getStatus() : null
        }
      };
      ws.send(JSON.stringify(init));
      ws.on('close', () => {
        console.log('📊 Telemetry client disconnected');
        this.mavlinkHandler.removeClient(ws);
      });
      ws.on('error', (err) => console.error('Telemetry WS error:', err));
    });

    // Command handlers
    this.wssCommands.on('connection', (ws) => {
      console.log('🎮 New command client connected');
      ws.on('message', (message) => {
        try {
          const command = JSON.parse(message);
          console.log(`📨 Received command: ${command.type}`);
          if (command.type === 'NETWORK_SWITCH') {
            this.handleNetworkSwitch(command, ws);
          } else if (command.type === 'NETWORK_STATUS') {
            this.handleNetworkStatusRequest(ws);
          } else {
            this.mavlinkHandler.sendMavlinkCommand(command);
          }
        } catch (error) {
          console.error('❌ Command error:', error);
        }
      });
      ws.on('close', () => console.log('🎮 Command client disconnected'));
      ws.on('error', err => console.error('Command WS error:', err));
    });

    console.log('✅ WebSocket handlers attached for signaling, telemetry and commands (single-port mode)');
  }

  async handleNetworkSwitch(command, ws) {
    try {
      let result;
      if (command.params.target === 'lte') {
        result = await this.networkSwitcher.switchToLTE('manual_switch');
      } else if (command.params.target === 'wifi') {
        result = await this.networkSwitcher.switchToWiFi('manual_switch');
      }
      ws.send(JSON.stringify({
        type: 'command_ack',
        command: command.type,
        status: result ? 'SUCCESS' : 'FAILED',
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Network switch error:', error);
    }
  }

  handleNetworkStatusRequest(ws) {
    const status = {
      type: 'network_status',
      data: {
        network: this.networkManager.getNetworkStatus(),
        lte: this.lteModem.getStatus(),
        switching: this.networkSwitcher.getStatus(),
        timestamp: new Date().toISOString()
      }
    };
    ws.send(JSON.stringify(status));
  }

  fallbackToLocalMode() {
    console.log('🔄 Falling back to local mode only');
    this.remoteAccessEnabled = false;
  }

  async shutdown() {
    console.log('\n🛑 Shutting down Enhanced GCS Server...');
    try {
      this.networkManager.stopMonitoring();
      if (this.networkSwitcher) this.networkSwitcher.stopSwitching();
      await this.zerotier.leaveNetwork();
    } catch (e) { /* ignore */ }

    // close mavlink handler
    try { this.mavlinkHandler.destroy(); } catch (e) {}
    console.log('✅ Server shutdown complete');
  }
}

module.exports = EnhancedGCSServer;
