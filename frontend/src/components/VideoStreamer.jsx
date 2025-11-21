import React, { useEffect, useRef, useState } from "react";

const VideoStreamer = () => {
  const videoRef = useRef(null);
  const peer = useRef(null);
  const socket = useRef(null);
  const [status, setStatus] = useState("Disconnected");
  const [error, setError] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const localStream = useRef(null);

  useEffect(() => {
    initializeConnection();

    return () => {
      // Cleanup
      stopStream(); // Stop stream on component unmount
      if (socket.current) {
        socket.current.close();
      }
      if (peer.current) {
        peer.current.close();
      }
    };
  }, []);

  const initializeConnection = () => {
    try {
      setStatus("Connecting to signaling server...");
      setError("");
      
      const signalingUrl =
  import.meta.env.VITE_SIGNALING_WS ||
  `ws://${window.location.hostname}:3000/ws/signaling`;

      console.log("Connecting to:",signalingUrl );
      
      socket.current = new WebSocket(signalingUrl);

      socket.current.onopen = () => {
        setStatus("Connected to signaling server - Ready to stream");
        setError("");
        socket.current.send(JSON.stringify({ role: "streamer" }));
        console.log("✅ WebSocket connected successfully");
      };

      socket.current.onerror = (error) => {
        const errorMsg = "WebSocket connection failed. Make sure the signaling server is running on port 8081.";
        setError(errorMsg);
        setStatus("Connection failed");
        console.error("WebSocket error:", error);
      };

      socket.current.onclose = (event) => {
        if (event.code !== 1000) {
          setStatus("Disconnected from signaling server");
          console.log("WebSocket closed:", event.code, event.reason);
        }
      };

      setupPeerConnection();
    } catch (err) {
      setError("Failed to initialize connection: " + err.message);
      console.error("Initialization error:", err);
    }
  };

  const setupPeerConnection = () => {
    peer.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
      ],
    });

    peer.current.onicecandidate = (event) => {
      if (event.candidate && socket.current?.readyState === WebSocket.OPEN) {
        socket.current.send(
          JSON.stringify({
            target: "viewer",
            type: "ice",
            candidate: event.candidate,
          })
        );
      }
    };

    peer.current.onconnectionstatechange = () => {
      const connectionState = peer.current.connectionState;
      setStatus(`Peer connection: ${connectionState}`);
      console.log("Peer connection state:", connectionState);
      
      if (connectionState === "disconnected" || connectionState === "failed") {
        setIsStreaming(false);
      }
    };

    // Handle incoming messages
    if (socket.current) {
      socket.current.onmessage = async (msg) => {
        try {
          const data = JSON.parse(msg.data);
          console.log("Received message:", data);

          if (data.type === "answer") {
            await peer.current.setRemoteDescription(data.answer);
            setStatus("WebRTC connection established - Streaming active");
          } else if (data.type === "ice" && data.candidate) {
            await peer.current.addIceCandidate(data.candidate);
          }
        } catch (err) {
          console.error("Error handling message:", err);
        }
      };
    }
  };

  const startStream = async () => {
    try {
      setStatus("Requesting camera access...");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      localStream.current = stream;
      videoRef.current.srcObject = stream;
      setStatus("Camera active, starting WebRTC stream...");
      setIsStreaming(true);

      // Add all tracks to peer connection
      stream.getTracks().forEach((track) => {
        peer.current.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await peer.current.createOffer();
      await peer.current.setLocalDescription(offer);

      if (socket.current?.readyState === WebSocket.OPEN) {
        socket.current.send(JSON.stringify({
          target: "viewer",
          type: "offer",
          offer: offer,
        }));
        setStatus("Offer sent to viewer - Waiting for connection");
      } else {
        setError("WebSocket not connected");
      }
    } catch (err) {
      setError(`Failed to access camera: ${err.message}`);
      console.error("Stream start error:", err);
      setIsStreaming(false);
    }
  };

  const stopStream = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        track.stop(); // Stop each track
      });
      localStream.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // Remove all tracks from peer connection
    if (peer.current) {
      const senders = peer.current.getSenders();
      senders.forEach(sender => {
        if (sender.track) {
          sender.track.stop();
        }
        peer.current.removeTrack(sender);
      });
    }
    
    setIsStreaming(false);
    setStatus("Stream stopped - Ready to start new stream");
    console.log("Stream stopped");
  };

  const reconnect = () => {
    stopStream(); // Stop current stream first
    if (socket.current) {
      socket.current.close();
    }
    if (peer.current) {
      peer.current.close();
    }
    initializeConnection();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Video Streamer (Drone Side)</h2>
      <div>
        <button 
          onClick={startStream} 
          disabled={isStreaming}
          style={{ 
            backgroundColor: isStreaming ? '#ccc' : '#4CAF50',
            color: 'white',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: isStreaming ? 'not-allowed' : 'pointer'
          }}
        >
          Start Streaming
        </button>
        <button 
          onClick={stopStream} 
          disabled={!isStreaming}
          style={{ 
            marginLeft: "10px",
            backgroundColor: !isStreaming ? '#ccc' : '#f44336',
            color: 'white',
            padding: '10px 15px',
            border: 'none',
            borderRadius: '4px',
            cursor: !isStreaming ? 'not-allowed' : 'pointer'
          }}
        >
          Stop Streaming
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
          <div style={{ fontSize: "12px", marginTop: "5px" }}>
            Run this command in your backend folder: <code>node webrtc-signaling.js</code>
          </div>
        </div>
      )}
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        style={{ 
          width: "500px", 
          border: "1px solid #ccc",
          display: "block",
          marginTop: "10px"
        }} 
      />
    </div>
  );
};

export default VideoStreamer;