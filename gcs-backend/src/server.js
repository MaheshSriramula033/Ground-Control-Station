// backend/src/server.js
import express from "express";
import http from "http";
import config from "./config/config.js";

import createWebsocket, { attachHttp, publishTelemetry } from "./websocket/telemetry_ws.js";
import { startUdpReceiver } from "./telemetry/udp_receiver.js";

import morgan from "morgan";
import { startSignaling } from "./signaling/webrtc_signaling.js";
import { startNetworkSimulator } from "./network/network_simulator.js";

const app = express();
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) =>
  res.json({ status: "ok", ts: Date.now() })
);

const server = http.createServer(app);

// ----------------------------
// TELEMETRY WS
// ----------------------------
createWebsocket(server);

// attach /latest HTTP endpoint for render polling
attachHttp(app);

// ----------------------------
// Accept telemetry via HTTP (worker / external simulator)
// ----------------------------
app.post("/api/telemetry", (req, res) => {
  try {
    const payload = req.body;
    // you may validate payload here
    publishTelemetry(payload);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Failed to accept telemetry via /api/telemetry", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ----------------------------
// WEBRTC SIGNALING WS
// ----------------------------
startSignaling(server);

// ----------------------------
// UDP RECEIVER (LOCAL ONLY)
// If you want UDP enabled on Render, set process.env.ENABLE_UDP === "true" in Render service
// ----------------------------
if (process.env.ENABLE_UDP === "true") {
  startUdpReceiver();
  console.log("UDP Enabled");
} else {
  console.log("UDP Disabled (only HTTP / WebSocket telemetry enabled)");
}

// ----------------------------
// NETWORK SIMULATOR
// ----------------------------
startNetworkSimulator();

server.listen(config.PORT, () => {
  console.log(`Backend running on http://localhost:${config.PORT}`);
  console.log(`Telemetry WS ready at ws://localhost:${config.PORT}/`);
  console.log(`WebRTC signaling ready at ws://localhost:${config.PORT}/signal`);
  console.log(`HTTP telemetry endpoint: POST http://localhost:${config.PORT}/api/telemetry`);
});
