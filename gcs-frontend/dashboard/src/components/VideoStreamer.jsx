import React, { useRef, useState } from "react";

const SIGNAL_PATH = "/signal";

function buildSignalUrl() {
  const env = import.meta.env.VITE_BACKEND_WS || "";

  if (env) {
    if (env.startsWith("ws://") || env.startsWith("wss://")) {
      return env.endsWith(SIGNAL_PATH)
        ? env
        : env.replace(/\/+$/, "") + SIGNAL_PATH;
    }

    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${env}${SIGNAL_PATH}`;
  }

  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.hostname}${window.location.port ? ":" + window.location.port : ""}${SIGNAL_PATH}`;
}

export default function VideoStreamer() {
  const localVideoRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const [status, setStatus] = useState("Idle");

  const createWS = () => {
    const url = buildSignalUrl();
    console.log("Streamer connecting to signaling at", url);
    return new WebSocket(url);
  };

  const start = async () => {
    try {
      setStatus("Connecting to signaling...");
      const ws = createWS();
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join", room: "demo", role: "streamer" }));
      };

      ws.onmessage = async (ev) => {
        const msg = JSON.parse(ev.data);

        if (msg.type === "joined") {
          setStatus("Preparing camera...");
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });

            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const pc = new RTCPeerConnection({
              iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            });

            pcRef.current = pc;

            stream.getTracks().forEach((track) =>
              pc.addTrack(track, stream)
            );

            pc.onicecandidate = (iceEv) => {
              if (iceEv.candidate && ws.readyState === 1) {
                ws.send(
                  JSON.stringify({
                    type: "candidate",
                    room: "demo",
                    candidate: iceEv.candidate,
                  })
                );
              }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            ws.send(
              JSON.stringify({
                type: "offer",
                room: "demo",
                sdp: offer.sdp,
              })
            );

            setStatus("Offer sent");
          } catch (err) {
            console.error(err);
            setStatus("Camera/Offer error");
          }
        }

        if (msg.type === "answer") {
          try {
            await pcRef.current.setRemoteDescription({
              type: "answer",
              sdp: msg.sdp,
            });
            setStatus("Streaming");
          } catch (err) {
            console.error("Remote answer error", err);
            setStatus("Remote answer error");
          }
        }

        if (msg.type === "candidate" && msg.candidate) {
          try {
            await pcRef.current?.addIceCandidate(msg.candidate);
          } catch (e) {
            console.warn("Candidate add error", e);
          }
        }
      };
    } catch (err) {
      console.error("Streamer start error:", err);
      setStatus("Failed");
    }
  };

  const stop = () => {
    if (pcRef.current) pcRef.current.close();
    if (wsRef.current) wsRef.current.close();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    setStatus("Stopped");
  };

  return (
    <div className="video-card">
      <h3 className="video-title">🎥 Video Streamer (Drone Side)</h3>

      <div className="btn-row">
        <button className="btn-start" onClick={start}>Start Streaming</button>
        <button className="btn-stop" onClick={stop}>Stop Streaming</button>
      </div>

      <div className="status-text">{status}</div>

      <div className="video-box">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="video-element"
        />
      </div>
    </div>
  );
}
