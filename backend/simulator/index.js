const dgram = require("dgram");
const WebSocket = require("./node_modules/ws");

// UDP clients for MAVLink simulation and command listening
const telemetryClient = dgram.createSocket("udp4");
const commandClient = dgram.createSocket("udp4");

// WebSocket connection to GCS backend
const gcsWebSocket = new WebSocket("ws://localhost:8082");

// Command listener for receiving MAVLink commands from GCS
commandClient.on("message", (msg) => {
  try {
    const command = JSON.parse(msg.toString());
    console.log(`🎮 Simulator received MAVLink command: ${command.command}`);
    
    // Handle different MAVLink commands
    switch (command.command) {
      case 'ARM':
        console.log('🚁 ARM command received - Drone arming...');
        // Simulate arming sequence
        break;
      case 'DISARM':
        console.log('🚁 DISARM command received - Drone disarming...');
        // Simulate disarming
        break;
      case 'TAKEOFF':
        console.log(`🚁 TAKEOFF command received - Taking off to ${command.params.altitude}m`);
        // Simulate takeoff
        break;
      case 'SET_MODE':
        console.log(`🚁 SET_MODE command received - Changing to ${command.params.mode}`);
        // Simulate mode change
        break;
      case 'SET_WAYPOINT':
        console.log(`🚁 WAYPOINT command received - Lat: ${command.params.lat}, Lng: ${command.params.lng}, Alt: ${command.params.alt}`);
        // Simulate waypoint set
        break;
      default:
        console.log(`🚁 Unknown command: ${command.command}`);
    }
  } catch (error) {
    console.error('❌ Command parse error:', error);
  }
});

// Bind command listener to MAVLink command port
commandClient.bind(14551, () => {
  console.log("🎮 MAVLink Command listener running on UDP 14551");
});

function random(min, max) {
  return Math.random() * (max - min) + min;
}

gcsWebSocket.on("open", () => {
  console.log("✅ Connected to GCS backend WebSocket");
  console.log("📡 MAVLink Telemetry streaming started");
  
  setInterval(() => {
    const telemetry = {
      type: "MAVLINK_SIM",
      latitude: 17.385 + random(-0.001, 0.001),
      longitude: 78.4867 + random(-0.001, 0.001),
      altitude: 480 + random(-10, 10),
      speed: random(5, 15),

      // Mission Status
      mode: ["AUTO", "GUIDED", "LOITER", "RTL", "STABILIZE", "ALT_HOLD"][Math.floor(random(0, 6))],
      armed: Math.random() > 0.2,
      gps: {
        lock: Math.random() > 0.1,
        sats: Math.floor(random(8, 18))
      },
      battery: random(70, 100),
      groundSpeed: random(5, 15),
      heading: random(0, 360),
      satellites: Math.floor(random(8, 18)),
      voltage: 10 + (random(70, 100) / 100) * 4, // Simulate voltage
      current: 5 + random(0, 10), // Simulate current
      timestamp: Date.now()
    };

    // Send to GCS backend via WebSocket (primary channel)
    gcsWebSocket.send(JSON.stringify({
      type: "telemetry",
      data: telemetry
    }));

    // Also send via UDP (MAVLink simulation channel)
    const udpMessage = Buffer.from(JSON.stringify(telemetry));
    telemetryClient.send(udpMessage, 14550, "127.0.0.1", (err) => {
      if (err) console.error("❌ UDP Send Error:", err);
    });

    console.log("📡 MAVLink Telemetry:", {
      lat: telemetry.latitude.toFixed(6),
      lng: telemetry.longitude.toFixed(6),
      alt: telemetry.altitude.toFixed(1),
      battery: telemetry.battery.toFixed(1),
      mode: telemetry.mode,
      armed: telemetry.armed ? "ARMED" : "DISARMED"
    });
  }, 1000);
});

gcsWebSocket.on("error", (err) => {
  console.error("❌ GCS WebSocket connection failed:", err.message);
  console.log("💡 Make sure the GCS backend is running: node server.js");
});

gcsWebSocket.on("close", (event) => {
  console.log("🔌 Disconnected from GCS backend:", event.code, event.reason);
});

// Handle UDP errors
telemetryClient.on("error", (err) => {
  console.error("❌ Telemetry UDP Error:", err);
});

commandClient.on("error", (err) => {
  console.error("❌ Command UDP Error:", err);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MAVLink simulator...');
  telemetryClient.close();
  commandClient.close();
  gcsWebSocket.close();
  process.exit(0);
});

console.log("🚀 MAVLink Simulator starting...");
console.log("   - Telemetry UDP: 14550");
console.log("   - Command UDP: 14551");
console.log("   - GCS WebSocket: ws://localhost:8082");