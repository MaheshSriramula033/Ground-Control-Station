const WebSocket = require('ws');
const RealMavlinkHandler = require('./real-mavlink-handler');
const ZeroTierManager = require('./zerotier-manager');
const NetworkManager = require('./network-manager');
const LTEModem = require('./lte-modem');
const NetworkSwitcher = require('./network-switcher');

class EnhancedGCSServer {
  constructor() {
    this.zerotier = new ZeroTierManager();
    this.networkManager = new NetworkManager();
    this.lteModem = new LTEModem();
    this.networkSwitcher = null;
    this.mavlinkHandler = new RealMavlinkHandler();
    this.remoteAccessEnabled = false;
    this.config = {
      zerotierNetwork: process.env.ZEROTIER_NETWORK_ID || '8056c2e21c000001',
      ports: {
        web: 5173,
        telemetry: 8082,
        commands: 8083,
        signaling: 8081,
        mavlink: 14550
      }
    };
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Enhanced GCS Server...');
      
      // Setup servers first
      this.setupServers();
      
      // Initialize network management
      await this.initializeNetworkManagement();
      
      // Initialize remote access
      await this.initializeRemoteAccess();
      
      console.log('✅ Enhanced GCS Server initialized successfully!');
      
    } catch (error) {
      console.error('❌ Enhanced server initialization failed:', error.message);
      this.fallbackToLocalMode();
    }
  }

  async initializeNetworkManagement() {
    try {
      console.log('📶 Setting up network management...');
      
      // Initialize network manager
      const networkStatus = await this.networkManager.initialize();
      console.log(`📡 Current network: ${networkStatus.current.type} - ${networkStatus.current.address}`);
      
      // Initialize LTE modem
      const lteStatus = await this.lteModem.initialize();
      console.log(`📱 LTE Status: ${lteStatus.connected ? 'Connected' : 'Disconnected'} - ${lteStatus.signalStrength}%`);
      
      // Initialize network switcher
      this.networkSwitcher = new NetworkSwitcher(this.networkManager, this.lteModem);
      await this.networkSwitcher.initialize();
      
      // Start broadcasting network status
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
      console.warn('⚠️  Remote access unavailable:', error.message);
      this.fallbackToLocalMode();
    }
  }

  startNetworkBroadcasting() {
    // Broadcast network status every 10 seconds
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
      
      // Broadcast to all telemetry clients
      this.broadcastToTelemetryClients(networkStatus);
    }, 10000);
  }

  broadcastToTelemetryClients(message) {
    const messageStr = JSON.stringify(message);
    
    // This would broadcast to all connected telemetry clients
    // Implementation depends on how you're managing WebSocket clients
    console.log('📊 Broadcasting network status...');
  }

  displayAccessInfo(ztInfo) {
    const ports = this.config.ports;
    
    if (ztInfo.assignedIp) {
      console.log('\n📍 REMOTE ACCESS URLs:');
      console.log(`   GCS Dashboard:    http://${ztInfo.assignedIp}:${ports.web}`);
      console.log(`   Telemetry:        ws://${ztInfo.assignedIp}:${ports.telemetry}`);
      console.log(`   Commands:         ws://${ztInfo.assignedIp}:${ports.commands}`);
      console.log(`   Video Signaling:  ws://${ztInfo.assignedIp}:${ports.signaling}`);
      console.log(`   MAVLink:          udp://${ztInfo.assignedIp}:${ports.mavlink}`);
    }
    
    console.log('\n📍 LOCAL ACCESS URLs:');
    console.log(`   GCS Dashboard:    http://localhost:${ports.web}`);
    console.log(`   Telemetry:        ws://localhost:${ports.telemetry}`);
    console.log(`   Commands:         ws://localhost:${ports.commands}`);
    console.log(`   Video Signaling:  ws://localhost:${ports.signaling}`);
    console.log(`   MAVLink:          udp://localhost:${ports.mavlink}`);
    console.log('');
    
    if (ztInfo.simulation) {
      console.log('💡 NOTE: Running in simulation mode. Install ZeroTier for real remote access.');
    }
  }

  setupServers() {
    // WebRTC Signaling (port 8081)
    this.signalingServer = new WebSocket.Server({ port: 8081 });
    console.log('🎯 WebRTC Signaling Server: ws://localhost:8081');
    
    // Telemetry WebSocket (port 8082)
    this.telemetryServer = new WebSocket.Server({ 
      port: 8082,
      perMessageDeflate: false
    });
    console.log('📡 Telemetry Server: ws://localhost:8082');

    // Command WebSocket (port 8083)
    this.commandServer = new WebSocket.Server({ port: 8083 });
    console.log('🎮 Command Server: ws://localhost:8083');

    this.setupTelemetryServer();
    this.setupCommandServer();
    this.setupSignalingServer();
  }

  setupTelemetryServer() {
    this.telemetryServer.on('connection', (ws) => {
      console.log('📊 New telemetry client connected');
      this.mavlinkHandler.addClient(ws);
      
      // Send initial network status
      const networkStatus = {
        type: 'network_status',
        data: {
          network: this.networkManager.getNetworkStatus(),
          lte: this.lteModem.getStatus(),
          switching: this.networkSwitcher ? this.networkSwitcher.getStatus() : null
        }
      };
      
      ws.send(JSON.stringify(networkStatus));
      
      ws.on('close', () => {
        console.log('📊 Telemetry client disconnected');
        this.mavlinkHandler.removeClient(ws);
      });
    });
  }

  setupCommandServer() {
    this.commandServer.on('connection', (ws) => {
      console.log('🎮 New command client connected');
      
      ws.on('message', (message) => {
        try {
          const command = JSON.parse(message);
          console.log(`📨 Received command: ${command.type}`);
          
          // Handle network commands
          if (command.type === 'NETWORK_SWITCH') {
            this.handleNetworkSwitch(command, ws);
          } else if (command.type === 'NETWORK_STATUS') {
            this.handleNetworkStatusRequest(ws);
          } else {
            // Send to MAVLink handler
            this.mavlinkHandler.sendMavlinkCommand(command);
          }
          
        } catch (error) {
          console.error('❌ Command error:', error);
        }
      });
    });
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

  setupSignalingServer() {
    const clients = new Map();
    
    this.signalingServer.on('connection', (ws) => {
      console.log('🔗 New WebRTC connection');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.role) clients.set(ws, data.role);
          
          clients.forEach((role, client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
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
  }

  fallbackToLocalMode() {
    console.log('🔄 Falling back to local mode only');
    this.remoteAccessEnabled = false;
  }

  async shutdown() {
    console.log('\n🛑 Shutting down Enhanced GCS Server...');
    
    this.networkManager.stopMonitoring();
    this.networkSwitcher.stopSwitching();
    await this.zerotier.leaveNetwork();
    
    this.signalingServer?.close();
    this.telemetryServer?.close();
    this.commandServer?.close();
    
    console.log('✅ Server shutdown complete');
  }
}

module.exports = EnhancedGCSServer;