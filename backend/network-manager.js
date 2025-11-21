const { networkInterfaces } = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class NetworkManager {
  constructor() {
    this.currentNetwork = null;
    this.networkHistory = [];
    this.monitoring = false;
    this.preferredNetwork = 'wifi'; // wifi -> lte -> fallback
  }

  async initialize() {
    console.log('📶 Initializing Network Manager...');
    
    // Detect available network interfaces
    await this.scanNetworkInterfaces();
    
    // Start network monitoring
    this.startNetworkMonitoring();
    
    console.log('✅ Network Manager initialized');
    return this.getNetworkStatus();
  }

  async scanNetworkInterfaces() {
    try {
      const interfaces = networkInterfaces();
      const availableNetworks = [];

      console.log('🔍 Scanning network interfaces...');

      for (const [name, nets] of Object.entries(interfaces)) {
        for (const net of nets) {
          if (net.family === 'IPv4' && !net.internal) {
            const networkInfo = {
              interface: name,
              address: net.address,
              netmask: net.netmask,
              mac: net.mac,
              type: this.detectNetworkType(name, net.address),
              strength: await this.getNetworkStrength(name),
              timestamp: new Date().toISOString()
            };
            
            availableNetworks.push(networkInfo);
            console.log(`📡 Found: ${networkInfo.type} - ${name} - ${net.address}`);
          }
        }
      }

      // Select best network
      this.currentNetwork = this.selectBestNetwork(availableNetworks);
      this.networkHistory.push({
        timestamp: new Date().toISOString(),
        network: this.currentNetwork
      });

    } catch (error) {
      console.error('❌ Network scan failed:', error);
    }
  }

  detectNetworkType(interfaceName, ipAddress) {
    const interfaceLower = interfaceName.toLowerCase();
    
    // Detect WiFi
    if (interfaceLower.includes('wifi') || 
        interfaceLower.includes('wireless') || 
        interfaceLower.includes('wl')) {
      return 'wifi';
    }
    
    // Detect Ethernet
    if (interfaceLower.includes('ethernet') || 
        interfaceLower.includes('eth') ||
        interfaceLower.includes('lan') ||
        interfaceLower.includes('local')) {
      return 'ethernet';
    }
    
    // Detect Cellular (4G/LTE)
    if (interfaceLower.includes('wwan') || 
        interfaceLower.includes('cellular') ||
        interfaceLower.includes('mobile') ||
        interfaceLower.includes('rmnet') ||
        ipAddress.startsWith('10.') || // Common cellular IP ranges
        ipAddress.startsWith('192.168.')) {
      return 'lte';
    }
    
    // Detect VPN
    if (interfaceLower.includes('vpn') || 
        interfaceLower.includes('zt') || // ZeroTier
        interfaceLower.includes('tun')) {
      return 'vpn';
    }
    
    return 'unknown';
  }

  async getNetworkStrength(interfaceName) {
    try {
      if (process.platform === 'win32') {
        return await this.getWindowsNetworkStrength(interfaceName);
      } else {
        return await this.getUnixNetworkStrength(interfaceName);
      }
    } catch (error) {
      // Return simulated strength for development
      return Math.floor(Math.random() * 100);
    }
  }

  async getWindowsNetworkStrength(interfaceName) {
    try {
      const { stdout } = await execAsync('netsh wlan show interfaces');
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        if (line.includes('Signal') && line.includes('%')) {
          const match = line.match(/(\d+)%/);
          return match ? parseInt(match[1]) : 75;
        }
      }
      return 75;
    } catch (error) {
      return 75; // Default strength
    }
  }

  async getUnixNetworkStrength(interfaceName) {
    try {
      if (interfaceName.includes('wlan')) {
        const { stdout } = await execAsync(`iwconfig ${interfaceName}`);
        const match = stdout.match(/Signal level=(-?\d+)/);
        if (match) {
          // Convert to percentage (rough approximation)
          const level = parseInt(match[1]);
          return Math.max(0, Math.min(100, (level + 100) * 2));
        }
      }
      return 75;
    } catch (error) {
      return 75;
    }
  }

  selectBestNetwork(networks) {
    if (networks.length === 0) {
      return {
        type: 'offline',
        interface: 'none',
        address: '0.0.0.0',
        strength: 0,
        status: 'disconnected'
      };
    }

    // Prioritize networks by type and strength
    const prioritized = networks
      .map(net => ({
        ...net,
        priority: this.getNetworkPriority(net.type),
        score: net.strength + this.getNetworkPriority(net.type) * 10
      }))
      .sort((a, b) => b.score - a.score);

    const bestNetwork = prioritized[0];
    bestNetwork.status = 'connected';
    
    console.log(`🏆 Selected network: ${bestNetwork.type} (${bestNetwork.interface}) - Strength: ${bestNetwork.strength}%`);
    
    return bestNetwork;
  }

  getNetworkPriority(type) {
    const priorities = {
      'ethernet': 4,  // Highest priority - most reliable
      'wifi': 3,      // Good priority - reliable and fast
      'lte': 2,       // Medium priority - mobile data
      'vpn': 1,       // Lower priority - overlay network
      'unknown': 0    // Lowest priority
    };
    
    return priorities[type] || 0;
  }

  startNetworkMonitoring() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    console.log('📊 Starting network monitoring...');
    
    // Monitor network every 30 seconds
    this.monitorInterval = setInterval(async () => {
      await this.scanNetworkInterfaces();
      
      // Check if network changed significantly
      this.checkNetworkHealth();
      
    }, 30000);
  }

  checkNetworkHealth() {
    if (!this.currentNetwork) return;
    
    const health = {
      timestamp: new Date().toISOString(),
      network: this.currentNetwork.type,
      strength: this.currentNetwork.strength,
      status: 'healthy'
    };
    
    // Detect network issues
    if (this.currentNetwork.strength < 20) {
      health.status = 'poor';
      console.warn('⚠️  Poor network signal detected');
    }
    
    if (this.currentNetwork.strength < 10) {
      health.status = 'critical';
      console.error('🚨 Critical network signal - considering switch');
    }
    
    return health;
  }

  async simulateNetworkSwitch() {
    console.log('🔄 Simulating network switch...');
    
    // Simulate WiFi disconnection
    const oldNetwork = { ...this.currentNetwork };
    
    // Switch to LTE
    this.currentNetwork = {
      interface: 'wwan0',
      address: '10.128.45.67',
      type: 'lte',
      strength: 85,
      status: 'connected',
      timestamp: new Date().toISOString()
    };
    
    this.networkHistory.push({
      timestamp: new Date().toISOString(),
      event: 'network_switch',
      from: oldNetwork.type,
      to: this.currentNetwork.type,
      reason: 'simulated_switch'
    });
    
    console.log(`🔄 Network switched: ${oldNetwork.type} → ${this.currentNetwork.type}`);
    
    return this.currentNetwork;
  }

  async simulateNetworkFailure() {
    console.log('💥 Simulating network failure...');
    
    const oldNetwork = { ...this.currentNetwork };
    
    this.currentNetwork = {
      type: 'offline',
      interface: 'none',
      address: '0.0.0.0',
      strength: 0,
      status: 'disconnected',
      timestamp: new Date().toISOString()
    };
    
    this.networkHistory.push({
      timestamp: new Date().toISOString(),
      event: 'network_failure',
      from: oldNetwork.type,
      to: 'offline',
      reason: 'simulated_failure'
    });
    
    return this.currentNetwork;
  }

  getNetworkStatus() {
    return {
      current: this.currentNetwork,
      history: this.networkHistory.slice(-10), // Last 10 events
      monitoring: this.monitoring,
      timestamp: new Date().toISOString()
    };
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitoring = false;
      console.log('🛑 Network monitoring stopped');
    }
  }
}

module.exports = NetworkManager;