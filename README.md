🛰️ Cloud Ground Control Station (GCS)

A cloud-based Ground Control Station for drones featuring:

React + Vercel frontend

Node.js + Express + WebSocket + Render backend

MAVLink-style telemetry (altitude, GPS, battery, speed…)

WebRTC video streaming (Streamer + Viewer)

Simulated LTE/WiFi network conditions

Cloud-safe telemetry polling (Render friendly)

Drone simulator (UDP + HTTP modes)

🚀 Live Links
Component	URL
Backend (Render)	https://ground-control-station.onrender.com

Frontend (Vercel)	your-vercel-link-here
✨ Features

Real-time telemetry (WebSocket locally, HTTP polling on cloud)

Network simulator (latency, jitter, VPN, handover)

WebRTC live video (drone streamer → GCS viewer)

Drone simulator for testing (UDP or HTTP)

Fully deployable on free tiers (Render + Vercel)

📁 Quick Setup
Backend
cd gcs-backend
npm install
npm run dev


Run simulator (local):

node run_sim.js


Run cloud simulator:

node run_sim_http.js

Frontend
cd gcs-frontend
npm install
npm run dev

🔧 Environment Variables
Frontend (.env)
VITE_BACKEND_HTTP=ground-control-station.onrender.com
VITE_BACKEND_WS=wss://ground-control-station.onrender.com

Backend (.env)
PORT=3000
MAV_UDP_PORT=14550
ENABLE_UDP=false

🌤 Deployment
Render (Backend)

Build Command: None

Start Command: node src/server.js

Add .env above

Vercel (Frontend)

Add frontend .env above

Deploy directly from GitHub

📡 Architecture (Short)
Drone Simulator -> Backend (Render)
   UDP/HTTP     -> REST + WebSocket
Frontend (Vercel) <- /latest polling (telemetry)
                   <- WebSocket (network)
                   <- WebRTC video

🛞 Components

Telemetry: /api/telemetry, /latest, WS broadcast

Network sim: WiFi/LTE/4G, latency, jitter, loss

Video: WebRTC signaling at /signal

Charts & Map: Real-time updates
