import { WebSocketServer } from "ws";

let wss = null;
let lastTelemetry = null;

export default function createWebsocket(server) {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    // Skip signaling WS (handled separately)
    if (req.url === "/signal") return;

    // Accept ALL other WebSocket upgrade paths
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", () => {
    console.log("📡 Telemetry/Network WebSocket connected");
  });
}

/* -------------------------------
   BROADCAST TELEMETRY
--------------------------------*/
export function publishTelemetry(data) {
  lastTelemetry = data;
  if (!wss) return;

  const payload = JSON.stringify({ type: "telemetry", data });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

/* -------------------------------
   BROADCAST NETWORK STATUS
--------------------------------*/
export function publishNetworkStatus(status) {
  if (!wss) return;

  const payload = JSON.stringify({ type: "network", data: status });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

/* -------------------------------
   HTTP ENDPOINT: /latest
--------------------------------*/
export function attachHttp(app) {
  app.get("/latest", (req, res) => {
    res.json(lastTelemetry ?? {});
  });
}
