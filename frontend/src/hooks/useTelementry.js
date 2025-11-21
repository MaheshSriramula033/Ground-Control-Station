import { useEffect, useState } from "react";

export default function useTelemetry() {
  const [telemetry, setTelemetry] = useState(null);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");

    socket.onopen = () => {
      console.log("Connected to Telemetry Server");
    };

    socket.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        setTelemetry(data);
      } catch (err) {
        console.error("Invalid telemetry:", err);
      }
    };

    return () => socket.close();
  }, []);

  return telemetry;
}
