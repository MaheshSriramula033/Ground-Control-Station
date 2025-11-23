import express from "express";
import http from "http";
import config from "./config/config.js";

import createWebsocket, { attachHttp, publishTelemetry } 
  from "./websocket/telemetry_ws.js";

import { startUdpReceiver } from "./telemetry/udp_receiver.js";
import { startSignaling } from "./signaling/webrtc_signaling.js";
import { startNetworkSimulator } from "./network/network_simulator.js";

import morgan from "morgan";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "*",
    methods: "GET,POST,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) =>
  res.json({ status: "ok", ts: Date.now() })
);

const server = http.createServer(app);

// Telemetry + Network WebSocket
createWebsocket(server);

// Telemetry HTTP endpoint
attachHttp(app);

// Render-compatible Telemetry POST ingest
app.post("/api/telemetry", (req, res) => {
  try {
    publishTelemetry(req.body);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Failed to accept telemetry:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// WebRTC Signaling WS
startSignaling(server);

// UDP (local only)
if (process.env.ENABLE_UDP === "true") {
  startUdpReceiver();
  console.log("UDP RECEIVER ENABLED");
} else {
  console.log("UDP RECEIVER DISABLED (RENDER SAFE)");
}

// Simulated network stats
startNetworkSimulator();

// Start server
server.listen(config.PORT, () => {
  console.log(`Backend running on http://localhost:${config.PORT}`);
  console.log(`Telemetry WS ready at ws://localhost:${config.PORT}/`);
});
