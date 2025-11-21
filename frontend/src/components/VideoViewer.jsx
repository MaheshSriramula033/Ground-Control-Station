import React, { useEffect, useRef, useState } from "react";

const VideoViewer = () => {
  const videoRef = useRef(null);
  const peer = useRef(null);
  const socket = useRef(null);
  const [status, setStatus] = useState("Disconnected");
  const [error, setError] = useState("");
  const [isViewing, setIsViewing] = useState(false);

  useEffect(() => {
    initializeConnection();

    return () => {
      // Cleanup
      stopViewing();
      if (socket.current) {
        socket.current.close();
      }
      if (peer.current) {
        peer.current.close();
      }
    };
  }, []);

  const initializeConnection = async () => {
    try {
      setStatus("Connecting to signaling server...");
      setError(""); // Clear any previous errors
      
      const wsUrl = `ws://${window.location.hostname}:8081`;
      console.log("Viewer connecting to:", wsUrl);
      
      socket.current = new WebSocket(wsUrl);

      socket.current.onopen = () => {
        setStatus("Connected to signaling server - Waiting for stream");
        setError(""); // Clear error on successful connection
        socket.current.send(JSON.stringify({ role: "viewer" }));
        console.log("✅ Viewer WebSocket connected successfully");
      };

      socket.current.onerror = (error) => {
        const errorMsg = "WebSocket connection failed. Make sure the signaling server is running.";
        setError(errorMsg);
        setStatus("Connection failed");
        console.error("Viewer WebSocket error:", error);
      };

      socket.current.onclose = (event) => {
        if (event.code !== 1000) {
          setStatus("Disconnected from signaling server");
          console.log("Viewer WebSocket closed:", event.code, event.reason);
        }
      };

      setupPeerConnection();
    } catch (err) {
      setError("Failed to initialize connection: " + err.message);
      console.error("Viewer initialization error:", err);
    }
  };

  const setupPeerConnection = () => {
    peer.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
      ],
    });

    peer.current.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
        setStatus("Receiving video stream");
        setIsViewing(true);
        console.log("🎥 Video track received");
      }
    };

    peer.current.onicecandidate = (event) => {
      if (event.candidate && socket.current?.readyState === WebSocket.OPEN) {
        socket.current.send(
          JSON.stringify({
            target: "streamer",
            type: "ice",
            candidate: event.candidate,
          })
        );
        console.log("🧊 ICE candidate sent to streamer");
      }
    };

    peer.current.onconnectionstatechange = () => {
      const connectionState = peer.current.connectionState;
      setStatus(`Peer connection: ${connectionState}`);
      console.log("Viewer peer connection state:", connectionState);
      
      if (connectionState === "disconnected" || connectionState === "failed") {
        setIsViewing(false);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };

    peer.current.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", peer.current.iceConnectionState);
    };

    // Handle incoming messages
    if (socket.current) {
      socket.current.onmessage = async (msg) => {
        try {
          const data = JSON.parse(msg.data);
          console.log("Viewer received message:", data);

          if (data.type === "offer") {
            console.log("📨 Offer received from streamer");
            await peer.current.setRemoteDescription(data.offer);

            const answer = await peer.current.createAnswer();
            await peer.current.setLocalDescription(answer);

            if (socket.current?.readyState === WebSocket.OPEN) {
              socket.current.send(
                JSON.stringify({
                  target: "streamer",
                  type: "answer",
                  answer: answer,
                })
              );
              console.log("📤 Answer sent to streamer");
            }
          } else if (data.type === "ice" && data.candidate) {
            console.log("🧊 ICE candidate received from streamer");
            await peer.current.addIceCandidate(data.candidate);
          }
        } catch (err) {
          console.error("Error handling message:", err);
        }
      };
    }
  };

  const stopViewing = () => {
    if (peer.current) {
      // Close the peer connection
      peer.current.close();
      peer.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsViewing(false);
    setStatus("Viewing stopped - Ready for new stream");
    console.log("Viewing stopped");
    
    // Reinitialize peer connection for future streams
    setupPeerConnection();
  };

  const reconnect = () => {
    stopViewing();
    if (socket.current) {
      socket.current.close();
    }
    initializeConnection();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Video Viewer (GCS Side)</h2>
      <div>
        <button 
          onClick={stopViewing}
          disabled={!isViewing}
          style={{ 
            backgroundColor: !isViewing ? '#ccc' : '#f44336',
            color: 'white',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: !isViewing ? 'not-allowed' : 'pointer'
          }}
        >
          Stop Viewing
        </button>
        <button 
          onClick={reconnect}
          style={{ 
            marginLeft: "10px",
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reconnect Signaling
        </button>
      </div>
      <p><strong>Status:</strong> {status}</p>
      {error && (
        <div style={{ color: "red", margin: "10px 0" }}>
          <strong>Error: {error}</strong>
        </div>
      )}
      <video 
        ref={videoRef} 
        autoPlay 
        controls
        style={{ 
          width: "500px", 
          border: "1px solid #ccc",
          display: "block",
          marginTop: "10px",
          backgroundColor: "#f0f0f0" // Show background when no video
        }} 
      />
      {!isViewing && (
        <p style={{ color: '#666', fontStyle: 'italic' }}>
          Waiting for video stream... Make sure the Streamer has started streaming.
        </p>
      )}
    </div>
  );
};

export default VideoViewer;