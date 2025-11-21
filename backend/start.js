const EnhancedGCSServer = require('./enhanced-server');
require("dotenv").config();
require("./http-server");

console.log('🚀 Starting Ground Control Station...');
console.log('=====================================');

// Optional simulator runner
let startSimulator = null;
if (process.env.USE_SIMULATOR === "true") {
  try {
    startSimulator = require("./simulator-runner");
  } catch (err) {
    console.log("⚠️ Simulator runner not found. Skipping simulator.");
  }
}

const server = new EnhancedGCSServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await server.shutdown();
  process.exit(0);
});

// Start GCS + Simulator
server.initialize()
  .then(() => {
    console.log("✅ GCS Core Services Started");

    if (startSimulator) {
      console.log("🛠 Starting MAVLink Drone Simulator (USE_SIMULATOR=true)...");
      startSimulator();
    } else {
      console.log("⚠️ Simulator disabled. Set USE_SIMULATOR=true in .env to enable it.");
    }
  })
  .catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
