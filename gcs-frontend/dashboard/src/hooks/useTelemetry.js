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

    // Cloud mode → HTTP polling only
    const isCloud =
      backendHost.includes("onrender.com") ||
      window.location.hostname.includes("vercel.app");

    if (isCloud) {
      console.log("🌍 CLOUD MODE: Polling", httpUrl);
      setConnectionStatus("Connected");

      const interval = setInterval(async () => {
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

      return () => clearInterval(interval);
    }

    // Local mode → enable WebSocket
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = backendHost.startsWith("ws")
      ? backendHost
      : `${wsProtocol}://${backendHost}`;

    console.log("📡 LOCAL WS MODE:", wsUrl);
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
      } catch (e) {
        console.warn("Telemetry parse error", e);
      }
    };

    ws.onerror = () => setConnectionStatus("Error");
    ws.onclose = () => setConnectionStatus("Disconnected");

    return () => ws.close();
  }, []);

  return { telemetry, recent: bufferRef.current, connectionStatus, network };
}
