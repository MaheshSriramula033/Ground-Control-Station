import React, { useEffect, useRef, useState } from "react";

const SIGNAL_PATH = "/signal";

export default function VideoViewer() {
  const remoteVideoRef = useRef(null);
  const wsRef = useRef(null);
  const pcRef = useRef(null);
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    const url = `${window.location.protocol === "https:" ? "wss" : "ws"}://${
      window.location.hostname
    }:3000${SIGNAL_PATH}`;

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
          const pc = new RTCPeerConnection();
          pcRef.current = pc;

          pc.ontrack = (ev2) => {
            remoteVideoRef.current.srcObject = ev2.streams[0];
          };

          pc.onicecandidate = (ev3) => {
            if (ev3.candidate)
              ws.send(
                JSON.stringify({
                  type: "candidate",
                  room: "demo",
                  candidate: ev3.candidate,
                })
              );
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

          setStatus("Answer sent. Waiting for stream…");
        } catch (err) {
          setStatus("Offer error");
        }
      }
    };

    ws.onclose = () => setStatus("Signaling closed");

    return () => {
      ws.close();
      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  return (
    <div className="video-card">
      <h3 className="video-title">📡 Video Viewer (GCS Side)</h3>

      <div className="btn-row">
        <button className="btn-stop" onClick={() => {
          if (pcRef.current)
            pcRef.current.getReceivers().forEach(r => r.track?.stop());
        }}>
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
