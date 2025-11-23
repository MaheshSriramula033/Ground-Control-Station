// frontend/src/hooks/useTelemetry.js
import { useEffect, useRef, useState } from "react";

export default function useTelemetry() {
  const [telemetry, setTelemetry] = useState(null);
  const [network, setNetwork] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  const bufferRef = useRef([]);

  useEffect(() => {
    const backendHost = import.meta.env.VITE_BACKEND_HTTP;
    const backendUrl = backendHost.startsWith("http")
      ? backendHost
      : `https://${backendHost}`;

    const httpUrl = `${backendUrl}/latest`;

    // -----------------------------
    // CLOUD MODE → HTTP polling + WS (NETWORK ONLY)
    // -----------------------------
    const isCloud =
      backendHost.includes("onrender.com") ||
      window.location.hostname.includes("vercel.app");

    if (isCloud) {
      console.log("🌍 CLOUD MODE ENABLED");
      setConnectionStatus("Connected");

      // ---- TELEMETRY via HTTP polling ----
      const poll = setInterval(async () => {
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
          bufferRef.current = [...bufferRef.current, unified].slice(-120);
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 1000);

      // ---- NETWORK UPDATES via WebSocket ----
      const wsProtocol = "wss";
      const wsUrl = `${wsProtocol}://${backendHost}`;

      console.log("🌐 Network WS connecting:", wsUrl);

      const networkWs = new WebSocket(wsUrl);

      networkWs.onmessage = (ev) => {
        try {
          const obj = JSON.parse(ev.data);
          if (obj.type === "network") {
            setNetwork(obj.data);
          }
        } catch {}
      };

      networkWs.onerror = (e) => console.warn("Network WS error", e);

      return () => {
        clearInterval(poll);
        try { networkWs.close(); } catch {}
      };
    }

    // -----------------------------
    // LOCAL MODE → Full WebSocket
    // -----------------------------
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${wsProtocol}://${backendHost}`;

    console.log("📡 LOCAL FULL WS MODE:", wsUrl);
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
          bufferRef.current = [...bufferRef.current, unified].slice(-120);
        }
      } catch {}
    };

    ws.onerror = () => setConnectionStatus("Error");
    ws.onclose = () => setConnectionStatus("Disconnected");

    return () => ws.close();
  }, []);

  return { telemetry, network, recent: bufferRef.current, connectionStatus };
}
