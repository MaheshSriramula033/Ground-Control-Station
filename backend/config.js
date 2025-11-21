require("dotenv").config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",

  // Ports
  SIGNAL_PORT: process.env.WEBSOCKET_SIGNALING_PORT || 8081,
  TELEMETRY_PORT: process.env.WEBSOCKET_TELEMETRY_PORT || 8082,
  COMMAND_PORT: process.env.WEBSOCKET_COMMAND_PORT || 8083,
  UDP_PORT: process.env.MAVLINK_UDP_PORT || 14550,

  // Flags
  USE_SIMULATOR: process.env.USE_SIMULATOR === "true",
  ZEROTIER_ENABLED: process.env.ZEROTIER_ENABLED === "true",

  // Network
  ZEROTIER_NETWORK_ID: process.env.ZEROTIER_NETWORK_ID || null,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "*",
  
  // App
  PORT: process.env.PORT || 3000,
};
