// frontend/src/hooks/useTelemetry.js
import { useEffect, useRef, useState } from "react";

export default function useTelemetry() {
  const [telemetry, setTelemetry] = useState(null);
  const [network, setNetwork] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  const bufferRef = useRef([]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const backendHost = import.meta.env.VITE_BACKEND_URL; // must be set
    const wsUrl = `${protocol}://${backendHost}`;
    const httpUrl = `https://${backendHost}/latest`;

    const isRender =
      backendHost.includes("onrender.com") ||
      window.location.hostname.includes("onrender.com");

    // -----------------------------
    // 🔵 RENDER MODE → HTTP Polling
    // -----------------------------
    if (isRender) {
      console.log("🌍 Running in Render mode: using HTTP polling");

      setInterval(async () => {
        try {
          const res = await fetch(httpUrl);
          const t = await res.json();
          if (!t || !t.ts) return;

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
          bufferRef.current = [...bufferRef.current, unified].slice(-50);
        } catch {}
      }, 1000);

      return;
    }

    // -----------------------------
    // LOCAL MODE → WebSocket
    // -----------------------------
    console.log("📡 Connecting WS:", wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setConnectionStatus("Connected");

    ws.onmessage = (ev) => {
      try {
        const obj = JSON.parse(ev.data);

        if (obj.type === "network") {
          setNetwork(obj.data);
          return;
        }

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
          bufferRef.current = [...bufferRef.current, unified].slice(-50);
        }
      } catch {}
    };

    ws.onerror = () => setConnectionStatus("Error");
    ws.onclose = () => setConnectionStatus("Disconnected");

    return () => ws.close();
  }, []);

  return {
    telemetry,
    network,
    recent: bufferRef.current,
    connectionStatus,
  };
}
