// frontend/.../VideoStreamer.jsx
import React, { useRef, useState } from "react";

const SIGNAL_PATH = "/signal";

export default function VideoStreamer() {
  const localVideoRef = useRef(null);
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const localStreamRef = useRef(null);
  const [status, setStatus] = useState("Idle");

  const createWS = () => {
    const wsUrl = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:3000${SIGNAL_PATH}`;
    return new WebSocket(wsUrl);
  };

  const start = async () => {
    try {
      setStatus("Connecting to signaling...");
      const ws = createWS();
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Streamer WS open");
        ws.send(JSON.stringify({ type: "join", room: "demo", role: "streamer" }));
      };

      ws.onmessage = async (ev) => {
        const msg = JSON.parse(ev.data);
        console.log("Streamer received signaling:", msg);

        // When joined by signaling server -> start camera and create offer
        if (msg.type === "joined") {
          setStatus("Joined signaling, preparing camera...");
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            // Create peer connection
            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            // Add local tracks
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            // When local ICE candidate found, send to signaling
            pc.onicecandidate = (iceEv) => {
              if (iceEv.candidate && ws && ws.readyState === 1) {
                console.log("Streamer sending candidate", iceEv.candidate);
                ws.send(JSON.stringify({ type: "candidate", room: "demo", candidate: iceEv.candidate }));
              }
            };

            // (optional) monitor connection state
            pc.onconnectionstatechange = () => {
              console.log("PC state:", pc.connectionState);
            };

            // create offer -> setLocalDescription -> send offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: "offer", room: "demo", sdp: offer.sdp }));
            setStatus("Offer sent, waiting for answer...");
          } catch (err) {
            console.error("getUserMedia or offer error:", err);
            setStatus("Camera/Offer error");
          }
          return;
        }

        // Handle an answer from viewer
        if (msg.type === "answer") {
          const pc = pcRef.current;
          if (!pc) {
            console.warn("Received answer but pcRef is null");
            return;
          }
          try {
            console.log("Streamer setting remote description (answer)...");
            await pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
            setStatus("Connected (streaming)");
          } catch (e) {
            console.error("Error applying remote answer:", e);
            setStatus("Remote answer error");
          }
          return;
        }

        // Handle ICE candidate coming from viewer
        if (msg.type === "candidate") {
          const pc = pcRef.current;
          if (pc && msg.candidate) {
            try {
              console.log("Streamer adding remote candidate", msg.candidate);
              await pc.addIceCandidate(msg.candidate);
            } catch (e) {
              console.warn("Error adding remote candidate:", e);
            }
          }
          return;
        }

        // other message types (error/debug)
        if (msg.type === "error") {
          console.warn("Signaling error:", msg.message);
        }
      };

      ws.onclose = () => {
        console.log("Streamer signaling closed");
        setStatus("Signaling closed");
      };

      ws.onerror = (err) => {
        console.error("Streamer WS error", err);
        setStatus("Signaling error");
      };
    } catch (e) {
      console.error("Start streaming error:", e);
      setStatus("Failed to start");
    }
  };

  const stop = () => {
    setStatus("Stopping...");
    // Close PeerConnection
    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach((s) => s.track?.stop && s.track.stop());
      } catch (e) {} // ignore
      pcRef.current.close();
      pcRef.current = null;
    }
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    // Clear video element
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    // Close signaling socket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
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
        <video ref={localVideoRef} autoPlay muted playsInline className="video-element" />
      </div>
    </div>
  );
}
