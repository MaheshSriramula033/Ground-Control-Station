// frontend/src/hooks/useTelemetry.js
import { useEffect, useRef, useState } from "react";

export default function useTelemetry() {
  const [telemetry, setTelemetry] = useState(null);
  const [network, setNetwork] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  const bufferRef = useRef([]);

  useEffect(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    // Use the backend hostname with port 3000 for local dev
    const url =import.meta.env.VITE_BACKEND_HTTP;

    console.log("📡 Connecting to:", url);

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnectionStatus("Connected");
      console.log("WS connected to", url);
    };
    ws.onmessage = (ev) => {
      try {
        const obj = JSON.parse(ev.data);
        if (obj.type === "telemetry") {
          const t = obj.data;

          const unified = {
            lat: t.lat,
            lon: t.lon,
            flightMode: t.flight_mode,
            armStatus: t.arm_status,
            gpsStatus: t.gps_status,
            satellites: t.satellites,
            altitude: t.alt_m ?? 0,
            speed: t.groundspeed_m_s ?? 0,
            heading: t.heading_deg ?? 0,
            batteryPct: Math.round(t.battery_pct ?? 0),
            voltage: t.voltage ?? 11.1,
            time: new Date(t.ts).toLocaleTimeString(),
          };

          setTelemetry(unified);
          bufferRef.current.push(unified);
          if (bufferRef.current.length > 120) bufferRef.current.shift();
        } else if (obj.type === "network") {
          setNetwork(obj.data);
        }
      } catch (e) {
        // ignore parsing errors
        console.warn("Telemetry parse error", e);
      }
    };
    ws.onclose = () => {
      setConnectionStatus("Disconnected");
      console.log("WS closed");
    };
    ws.onerror = (err) => {
      setConnectionStatus("Error");
      console.error("WS error", err);
    };

    return () => {
      try {
        ws.close();
      } catch {}
    };
  }, []);

  return { telemetry, recent: bufferRef.current, connectionStatus, network };
}
