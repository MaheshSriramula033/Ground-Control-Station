import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState, useRef } from "react";

// Vite-compatible imports for default markers
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix default marker icon issue (Vite compatible)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  shadowUrl: markerShadow,
});

// Create a simple drone icon using SVG data URL (no external file needed)
const createDroneIcon = () => {
  // SVG for drone icon as data URL
  const droneSvg = `data:image/svg+xml;base64,${btoa(`
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#00D4FF" stroke="#0099FF" stroke-width="2"/>
      <path d="M16 8L22 12L16 16M10 12L16 16M16 16V24M13 22H19M16 16L22 20M16 16L10 20" 
            stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `)}`;
  
  return new L.Icon({
    iconUrl: droneSvg,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
    className: "drone-icon"
  });
};

// Component to update map view
function MapUpdater({ position }) {
  const map = useMap();
  
  useEffect(() => {
    if (position && position[0] && position[1]) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  return null;
}

export default function DroneMap() {
  const [position, setPosition] = useState([17.3850, 78.4867]); // Hyderabad
  const [telemetry, setTelemetry] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Waiting for telemetry...");
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [messageCount, setMessageCount] = useState(0);
  const markerRef = useRef();

  useEffect(() => {
    console.log("🚀 DroneMap: Initializing WebSocket connection");

    const ws = new WebSocket("ws://localhost:8082");

    ws.onopen = () => {
      console.log("✅ DroneMap: WebSocket connected");
      setConnectionStatus("Connected to telemetry");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessageCount(prev => prev + 1);

        if (data.type === "telemetry") {
          const t = data.data;

          // Update position if we have valid coordinates
          if (t.latitude && t.longitude) {
            const newPosition = [t.latitude, t.longitude];
            console.log("📍 Updating position to:", newPosition);
            setPosition(newPosition);
          }

          // Update telemetry state
          setTelemetry({
            altitude: t.altitude,
            groundSpeed: t.groundSpeed,
            heading: t.heading,
            battery: t.battery
          });

          setLastUpdate(new Date());
          setConnectionStatus(`Live - ${new Date().toLocaleTimeString()}`);
        }
      } catch (err) {
        console.error("❌ Error parsing telemetry:", err);
        setConnectionStatus("Error parsing telemetry");
      }
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setConnectionStatus("Connection error");
    };

    ws.onclose = () => {
      setConnectionStatus("Disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);

  // Update marker position
  useEffect(() => {
    if (markerRef.current && position) {
      markerRef.current.setLatLng(position);
    }
  }, [position]);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        border: "2px solid rgba(255,255,255,0.1)",
        background: "#1a2d3e" // Fallback background
      }}
    >
      {/* Connection Status */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 1000,
          background: "rgba(0,0,0,0.8)",
          padding: "8px 12px",
          borderRadius: "6px",
          color: "white",
          fontSize: "12px",
          backdropFilter: "blur(10px)"
        }}
      >
        <div>{connectionStatus}</div>
        <div style={{ fontSize: "10px", opacity: 0.8, marginTop: "4px" }}>
          Lat: {position[0].toFixed(6)} | Lng: {position[1].toFixed(6)}
        </div>
      </div>

      {/* Telemetry Overlay */}
      {telemetry && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: 1000,
            background: "rgba(0,0,0,0.8)",
            padding: "8px 12px",
            borderRadius: "6px",
            color: "white",
            fontSize: "11px",
            backdropFilter: "blur(10px)"
          }}
        >
          <div><strong>Altitude:</strong> {telemetry.altitude?.toFixed(1)}m</div>
          <div><strong>Speed:</strong> {telemetry.groundSpeed?.toFixed(1)}m/s</div>
          <div><strong>Heading:</strong> {telemetry.heading?.toFixed(0)}°</div>
          <div><strong>Battery:</strong> {telemetry.battery?.toFixed(1)}%</div>
        </div>
      )}

      {/* Debug Info */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          zIndex: 1000,
          background: "rgba(255,255,255,0.9)",
          padding: "6px 10px",
          borderRadius: "6px",
          color: "#333",
          fontSize: "10px",
          fontWeight: "bold"
        }}
      >
        🎯 Marker Active at {position[0].toFixed(6)}, {position[1].toFixed(6)}
      </div>

      {/* Map Container */}
      <MapContainer 
        center={position} 
        zoom={16} 
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <MapUpdater position={position} />
        
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* Marker - Using default Leaflet marker as fallback */}
        <Marker 
          position={position} 
          ref={markerRef}
        >
          <Popup>
            <div style={{ minWidth: "200px" }}>
              <h3 style={{ marginBottom: "8px", color: "#00D4FF" }}>🚁 Drone Location</h3>
              <div style={{ lineHeight: "1.6" }}>
                <div><strong>Latitude:</strong> {position[0].toFixed(6)}</div>
                <div><strong>Longitude:</strong> {position[1].toFixed(6)}</div>
                {telemetry && (
                  <>
                    <div><strong>Altitude:</strong> {telemetry.altitude?.toFixed(1)} m</div>
                    <div><strong>Speed:</strong> {telemetry.groundSpeed?.toFixed(1)} m/s</div>
                    <div><strong>Heading:</strong> {telemetry.heading?.toFixed(0)}°</div>
                    <div><strong>Battery:</strong> {telemetry.battery?.toFixed(1)}%</div>
                  </>
                )}
                <div><strong>Last Update:</strong> {lastUpdate.toLocaleTimeString()}</div>
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}