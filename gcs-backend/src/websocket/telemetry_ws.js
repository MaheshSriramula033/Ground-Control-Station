// backend/src/websocket/telemetry_ws.js
import { WebSocketServer } from "ws";

let wss = null;

export default function createWebsocket(server) {
  // IMPORTANT: we do NOT attach directly to all upgrades
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    // Accept ONLY the telemetry WebSocket (root or /telemetry)
    if (req.url !== "/" && req.url !== "/telemetry") {
      return; // skip other paths like /signal
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    console.log("Dashboard WebSocket connected (telemetry)");
  });

  console.log("Telemetry WebSocket ready");
}

export function publishTelemetry(data) {
  if (!wss) return;
  const payload = JSON.stringify({ type: "telemetry", data });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

/**
 * Publish network status events to connected clients.
 * `status` should be a plain object, e.g.:
 * { vpn: 'connected', network: 'LTE', latency: 78, jitter: 5, loss: 0.3 }
 */
export function publishNetworkStatus(status) {
  if (!wss) return;
  const payload = JSON.stringify({ type: "network", data: status });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}
