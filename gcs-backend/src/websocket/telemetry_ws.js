// backend/src/websocket/telemetry_ws.js
import { WebSocketServer } from "ws";

let wss = null;
let lastTelemetry = null;

export default function createWebsocket(server) {
  wss = new WebSocketServer({ noServer: true });

  const allowedPaths = ["/", "/telemetry", "/ws", "/dashboard"];

  server.on("upgrade", (req, socket, head) => {
    if (!allowedPaths.includes(req.url)) return;

    console.log("✅ WS accepted for path:", req.url);

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws, req) => {
    console.log("📡 Telemetry WebSocket connected:", req.url);
  });

  console.log("Telemetry WebSocket ready");
}

export function publishTelemetry(data) {
  lastTelemetry = data;

  if (!wss) return;

  const payload = JSON.stringify({ type: "telemetry", data });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

export function publishNetworkStatus(status) {
  if (!wss) return;

  const payload = JSON.stringify({ type: "network", data: status });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

// -------- HTTP READER for Render frontend --------
export function attachHttp(app) {
  app.get("/latest", (req, res) => {
    res.json(lastTelemetry ?? {});
  });
}
