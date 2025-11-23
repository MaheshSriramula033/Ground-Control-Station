// backend/src/server.js
import express from "express";
import http from "http";
import config from "./config/config.js";

import createWebsocket from "./websocket/telemetry_ws.js";
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
// START TELEMETRY WS
// ----------------------------
createWebsocket(server);

// ----------------------------
// START WEBRTC SIGNALING WS
// ----------------------------
startSignaling(server);

// ----------------------------
// START UDP RECEIVER (LOCAL)
// ----------------------------
// keep UDP receiver enabled for local dev and simulator
startUdpReceiver();

// ----------------------------
// START NETWORK SIMULATOR (UI / simulated network only)
// ----------------------------
startNetworkSimulator();

server.listen(config.PORT, () => {
  console.log(`Backend running on http://localhost:${config.PORT}`);
  console.log(`Telemetry WS ready at ws://localhost:${config.PORT}/`);
  console.log(`WebRTC signaling ready at ws://localhost:${config.PORT}/signal`);
});
