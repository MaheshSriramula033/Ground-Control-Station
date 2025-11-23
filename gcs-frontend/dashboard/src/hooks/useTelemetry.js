import { useEffect, useRef, useState } from "react";

export default function useTelemetry() {
  const [telemetry, setTelemetry] = useState(null);
  const [network, setNetwork] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");

  const bufferRef = useRef([]);

  useEffect(() => {
    const backendHost = import.meta.env.VITE_BACKEND_HTTP; 
    // FIX 1: remove accidental "https//"
    const cleanHost = backendHost.replace("https//", "https://").replace("http//", "http://");

    const backendUrl = cleanHost.startsWith("http")
      ? cleanHost
      : `https://${cleanHost}`;

    const httpUrl = `${backendUrl}/latest`;

    const isCloud =
      cleanHost.includes("onrender.com") ||
      window.location.hostname.includes("vercel.app");

    /* -------------------------------------------------------
       CLOUD MODE → TELEMETRY via HTTP + NETWORK via WebSocket
    -------------------------------------------------------- */
    if (isCloud) {
      console.log("🌍 CLOUD MODE → HTTP + WS");

      setConnectionStatus("Connected");

      // TELEMETRY POLLING
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

      // ---------------------------- 
      // FIX 2: Proper WebSocket URL
      // ----------------------------
      const wsUrl = `wss://${cleanHost}`;  // no double https
      console.log("🔌 Network WS:", wsUrl);

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

    /* -------------------------------------------------------
        LOCAL MODE → FULL WebSocket (Telemetry + Network)
    -------------------------------------------------------- */
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${wsProtocol}://${cleanHost}`;

    console.log("📡 LOCAL WS:", wsUrl);
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
