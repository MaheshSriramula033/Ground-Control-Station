import React, { useEffect, useRef, useState } from "react";

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

export default function VideoViewer() {
  const remoteVideoRef = useRef(null);
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    const url = buildSignalUrl();
    console.log("Viewer connecting to signaling:", url);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", room: "demo", role: "viewer" }));
      setStatus("Connected to signaling");
    };

    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data);

      if (msg.type === "offer") {
        try {
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          });

          pcRef.current = pc;

          pc.ontrack = (ev2) => {
            remoteVideoRef.current.srcObject = ev2.streams[0];
          };

          pc.onicecandidate = (ev3) => {
            if (ev3.candidate) {
              ws.send(
                JSON.stringify({
                  type: "candidate",
                  room: "demo",
                  candidate: ev3.candidate,
                })
              );
            }
          };

          await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          ws.send(
            JSON.stringify({
              type: "answer",
              room: "demo",
              sdp: answer.sdp,
            })
          );

          setStatus("Answer sent. Waiting for stream...");
        } catch (err) {
          console.error("Viewer offer error:", err);
          setStatus("Offer error");
        }
      }

      if (msg.type === "candidate" && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(msg.candidate);
        } catch {}
      }
    };

    ws.onerror = () => setStatus("Signaling error");
    ws.onclose = () => setStatus("Signaling closed");

    return () => {
      try {
        ws.close();
      } catch {}

      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  return (
    <div className="video-card">
      <h3 className="video-title">📡 Video Viewer (GCS Side)</h3>

      <div className="btn-row">
        <button
          className="btn-stop"
          onClick={() => {
            pcRef.current?.getReceivers().forEach((r) => r.track?.stop());
          }}
        >
          Stop Viewing
        </button>
      </div>

      <div className="status-text">{status}</div>

      <div className="video-box">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="video-element"
        />
      </div>
    </div>
  );
}
