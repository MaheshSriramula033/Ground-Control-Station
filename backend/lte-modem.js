class LTEModem {
  constructor() {
    this.connected = false;
    this.signalStrength = 0;
    this.operator = '';
    this.networkType = '4G';
    this.simulated = true;
  }

  async initialize() {
    console.log('📱 Initializing LTE Modem...');
    
    // Simulate modem initialization
    await this.simulateDelay(2000);
    
    this.connected = true;
    this.signalStrength = Math.floor(Math.random() * 30) + 70; // 70-100%
    this.operator = this.getRandomOperator();
    
    console.log(`✅ LTE Modem connected: ${this.operator} - Strength: ${this.signalStrength}%`);
    
    return this.getStatus();
  }

  getRandomOperator() {
    const operators = ['JIO', 'Airtel', 'VI', 'BSNL', 'AT&T', 'Verizon', 'T-Mobile'];
    return operators[Math.floor(Math.random() * operators.length)];
  }

  async checkConnection() {
    if (!this.connected) {
      return { connected: false, signalStrength: 0 };
    }
    
    // Simulate signal fluctuations
    const fluctuation = Math.random() * 20 - 10; // -10 to +10
    this.signalStrength = Math.max(0, Math.min(100, this.signalStrength + fluctuation));
    
    // Randomly disconnect (1% chance)
    if (Math.random() < 0.01) {
      this.connected = false;
      console.log('📱 LTE Modem disconnected (simulated)');
    }
    
    return this.getStatus();
  }

  async reconnect() {
    console.log('🔄 Attempting LTE reconnection...');
    
    await this.simulateDelay(3000);
    
    this.connected = true;
    this.signalStrength = Math.floor(Math.random() * 30) + 70;
    
    console.log(`✅ LTE Modem reconnected: ${this.signalStrength}%`);
    
    return this.getStatus();
  }

  getStatus() {
    return {
      connected: this.connected,
      signalStrength: this.signalStrength,
      operator: this.operator,
      networkType: this.networkType,
      simulated: this.simulated,
      timestamp: new Date().toISOString()
    };
  }

  async sendData(data) {
    if (!this.connected) {
      throw new Error('LTE modem not connected');
    }
    
    // Simulate data transmission with variable latency
    const latency = Math.random() * 100 + 50; // 50-150ms
    await this.simulateDelay(latency);
    
    console.log(`📤 LTE Data sent: ${data.length} bytes, Latency: ${latency.toFixed(0)}ms`);
    
    return {
      success: true,
      bytesSent: data.length,
      latency: latency,
      timestamp: new Date().toISOString()
    };
  }

  simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = LTEModem;