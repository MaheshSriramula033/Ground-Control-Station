// backend/src/server.js
import express from "express";
import http from "http";
import config from "./config/config.js";

import createWebsocket, { attachHttp } from "./websocket/telemetry_ws.js";
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

// expose /latest API for Render frontend
attachHttp(app);

// ----------------------------
// WEBRTC SIGNALING WS
// ----------------------------
startSignaling(server);

// ----------------------------
// UDP RECEIVER (LOCAL ONLY)
// ----------------------------
if (process.env.RENDER !== "true") {
  startUdpReceiver();
  console.log("UDP Enabled (LOCAL MODE)");
} else {
  console.log("UDP Disabled (RENDER MODE)");
}

// ----------------------------
// NETWORK SIMULATOR
// ----------------------------
startNetworkSimulator();

server.listen(config.PORT, () => {
  console.log(`Backend running on http://localhost:${config.PORT}`);
  console.log(`Telemetry WS ready at ws://localhost:${config.PORT}/`);
  console.log(`WebRTC signaling ready at ws://localhost:${config.PORT}/signal`);
});
