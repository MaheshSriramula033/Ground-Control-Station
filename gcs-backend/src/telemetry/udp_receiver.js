// backend/src/telemetry/udp_receiver.js
import dgram from "dgram";
import config from "../config/config.js";
import { normalizeTelemetry } from "./message_normalizer.js";
import { publishTelemetry } from "../websocket/telemetry_ws.js";

export function startUdpReceiver() {
  if (process.env.RENDER === "true") {
    console.log("Skipping UDP receiver (Render free tier)");
    return;
  }

  const socket = dgram.createSocket("udp4");

  socket.on("message", (msg) => {
    try {
      let json;
      const raw = msg.toString();

      try {
        json = JSON.parse(raw);
      } catch {
        const decoded = Buffer.from(raw, "base64").toString("utf8");
        json = JSON.parse(decoded);
      }

      const normalized = normalizeTelemetry(json);
      publishTelemetry(normalized);
    } catch (e) {
      console.error("Telemetry processing error:", e);
    }
  });

  socket.bind(config.MAV_UDP_PORT, "0.0.0.0", () => {
    console.log(
      `UDP Telemetry Receiver listening on port ${config.MAV_UDP_PORT}`
    );
  });
}
