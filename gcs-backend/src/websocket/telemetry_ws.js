// backend/src/websocket/telemetry_ws.js
import { WebSocketServer } from "ws";

let wss = null;
let lastTelemetry = null;

export default function createWebsocket(server) {
  wss = new WebSocketServer({ noServer: true });

  const allowedPaths = ["/", "/telemetry", "/ws", "/dashboard"];

  server.on("upgrade", (req, socket, head) => {
    if (!allowedPaths.includes(req.url)) return;

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", () => {
    console.log("📡 Telemetry WebSocket connected");
  });
}

// ---- TELEMETRY WS BROADCAST ----
export function publishTelemetry(data) {
  lastTelemetry = data;

  if (!wss) return;

  const payload = JSON.stringify({ type: "telemetry", data });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

// ---- NETWORK WS BROADCAST ----
export function publishNetworkStatus(status) {
  if (!wss) return;

  const payload = JSON.stringify({ type: "network", data: status });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

// ---- HTTP ENDPOINT FOR LATEST TELEMETRY ----
export function attachHttp(app) {
  app.get("/latest", (req, res) => {
    res.json(lastTelemetry ?? {});
  });
}
