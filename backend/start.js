// backend/start.js
require('dotenv').config();

const { createHttpAndWsServers } = require('./ws-server');
const EnhancedGCSServer = require('./enhanced-server');

(async () => {
  try {
    // Create single HTTP + WS servers
    const port = process.env.PORT || 3000;
    const { server, wssSignaling, wssTelemetry, wssCommands, listen, close } = createHttpAndWsServers({ port });

    // Start listening
    await listen();

    // Create enhanced server with the WS servers
    const gcs = new EnhancedGCSServer({
      wssSignaling,
      wssTelemetry,
      wssCommands
    });

    // Optional simulator runner (unchanged)
    let startSimulator = null;
    if (process.env.USE_SIMULATOR === "true") {
      try {
        startSimulator = require("./simulator-runner");
      } catch (err) {
        console.log("⚠️ Simulator runner not found. Skipping simulator.");
      }
    }

    // Start everything
    await gcs.initialize();
    console.log('✅ GCS Core Services Started');

    if (startSimulator) {
      console.log('🛠 Starting MAVLink Drone Simulator (USE_SIMULATOR=true)...');
      startSimulator();
    } else {
      console.log('⚠️ Simulator disabled. Set USE_SIMULATOR=true in .env to enable it.');
    }

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Shutdown requested');
      try { await gcs.shutdown(); } catch (e) {}
      try { await close(); } catch (e) {}
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
})();
