const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class ZeroTierManager {
  constructor() {
    this.networkId = null;
    this.nodeId = null;
    this.assignedIp = null;
    this.status = 'disconnected';
    this.ztCommand = process.platform === 'win32' ? 'zerotier-cli' : 'zerotier-cli';
  }

  async initialize(networkId) {
    try {
      this.networkId = networkId;
      console.log('🌐 Initializing ZeroTier VPN...');

      // Check if ZeroTier CLI is available
      await this.checkZeroTierAvailable();

      // Get node ID
      await this.getNodeId();

      // Join the network
      await this.joinNetwork(networkId);

      // Get network status
      await this.getNetworkStatus();

      console.log(`✅ ZeroTier VPN Initialized!`);
      console.log(`   Network: ${this.networkId}`);
      console.log(`   Node ID: ${this.nodeId}`);
      console.log(`   Status: ${this.status}`);

      return this.getConnectionInfo();

    } catch (error) {
      console.error('❌ ZeroTier initialization failed:', error.message);
      throw error;
    }
  }

  async checkZeroTierAvailable() {
    try {
      const { stdout } = await execAsync(`${this.ztCommand} --version`);
      console.log(`✅ ZeroTier found: ${stdout.trim()}`);
      return true;
    } catch (error) {
      throw new Error(
        'ZeroTier is not installed or not in PATH. ' +
        'Please install from https://www.zerotier.com/download/ and ensure zerotier-cli is available.'
      );
    }
  }

  async getNodeId() {
    try {
      const { stdout } = await execAsync(`${this.ztCommand} info`);
      const match = stdout.match(/([a-f0-9]{10})/);
      if (match) {
        this.nodeId = match[1];
        return this.nodeId;
      }
      throw new Error('Could not extract node ID from zerotier-cli info');
    } catch (error) {
      throw new Error(`Failed to get node ID: ${error.message}`);
    }
  }

  async joinNetwork(networkId) {
    try {
      console.log(`🔗 Joining ZeroTier network: ${networkId}`);
      const { stdout, stderr } = await execAsync(`${this.ztCommand} join ${networkId}`);
      
      if (stderr && stderr.includes('error')) {
        // Check if already joined
        if (!stderr.includes('already')) {
          throw new Error(stderr);
        }
      }
      
      console.log(`✅ Joined network: ${networkId}`);
      return true;
    } catch (error) {
      if (error.message.includes('already a member')) {
        console.log(`ℹ️  Already a member of network: ${networkId}`);
        return true;
      }
      throw error;
    }
  }

  async getNetworkStatus() {
    try {
      const { stdout } = await execAsync(`${this.ztCommand} listnetworks`);
      const networks = this.parseNetworkOutput(stdout);
      
      const currentNetwork = networks.find(net => net.networkId === this.networkId);
      if (currentNetwork) {
        this.status = currentNetwork.status;
        this.assignedIp = currentNetwork.assignedIps ? currentNetwork.assignedIps.split(',')[0] : null;
        return currentNetwork;
      }
      
      this.status = 'pending_approval';
      return null;
    } catch (error) {
      throw new Error(`Failed to get network status: ${error.message}`);
    }
  }

  parseNetworkOutput(output) {
    const lines = output.split('\n').filter(line => line.trim());
    const networks = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/\s+/).filter(part => part);
      
      if (parts.length >= 6) {
        networks.push({
          networkId: parts[2],
          name: parts[3],
          status: parts[4],
          type: parts[5],
          device: parts[6],
          assignedIps: parts.slice(7).join(' ') || null
        });
      }
    }
    
    return networks;
  }

  async waitForConnection(timeout = 60000) {
    console.log('⏳ Waiting for ZeroTier connection...');
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const network = await this.getNetworkStatus();
        if (network && network.status === 'OK' && network.assignedIps) {
          this.status = 'connected';
          this.assignedIp = network.assignedIps.split(',')[0].trim();
          console.log(`✅ ZeroTier connected! Assigned IP: ${this.assignedIp}`);
          return true;
        }
        
        console.log('⏳ Waiting for IP assignment...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error('❌ Error checking network status:', error.message);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    throw new Error('Timeout waiting for ZeroTier connection');
  }

  async leaveNetwork() {
    if (!this.networkId) return;
    
    try {
      console.log(`🚪 Leaving ZeroTier network: ${this.networkId}`);
      await execAsync(`${this.ztCommand} leave ${this.networkId}`);
      this.status = 'disconnected';
      this.assignedIp = null;
      console.log(`✅ Left network: ${this.networkId}`);
    } catch (error) {
      console.error('❌ Failed to leave network:', error.message);
    }
  }

  getConnectionInfo() {
    return {
      networkId: this.networkId,
      nodeId: this.nodeId,
      assignedIp: this.assignedIp,
      status: this.status,
      timestamp: new Date().toISOString()
    };
  }

  // Method to get instructions for network authorization
  getAuthorizationInstructions() {
    if (!this.nodeId) return null;
    
    return {
      message: 'Network authorization required',
      instructions: [
        `1. Go to https://my.zerotier.com/network/${this.networkId}`,
        `2. Find node ID: ${this.nodeId}`,
        `3. Check the checkbox to authorize`,
        `4. Wait for IP assignment (this may take a minute)`
      ],
      nodeId: this.nodeId,
      networkId: this.networkId
    };
  }
}

module.exports = ZeroTierManager;