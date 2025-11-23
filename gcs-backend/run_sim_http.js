// backend/run_sim_http.js
/**
 * Simple HTTP-based simulator for Render background worker.
 * It posts JSON telemetry to the backend HTTP endpoint:
 *   POST ${TARGET_URL}/api/telemetry
 *
 * Configure:
 *  - BACKEND_URL (env) e.g. http://localhost:3000 or https://your-backend.onrender.com
 *  - INTERVAL_MS (env) default 1000
 *
 * This file is safe to run locally, or in Render worker. It does not require UDP.
 */

const TARGET_URL = "https://ground-control-station.onrender.com";
const INTERVAL = parseInt(process.env.INTERVAL_MS || "1000", 10);

let lat = 17.384508;
let lon = 78.487118;
let alt = 430;
let battery = 100;

function randomWalk() {
  lat += (Math.random() - 0.5) * 0.0003;
  lon += (Math.random() - 0.5) * 0.0003;
  alt += (Math.random() - 0.5) * 0.4;

  // realistic battery drain
  const drain = Math.random() * 1 + 0.5; // 0.5–1.5% per sec
  const noise = (Math.random() - 0.5) * 0.3; // jitter
  battery = Math.max(0, battery - drain + noise);
}

function generateTelemetry() {
  return {
    ts: Date.now(),
    sysid: 1,
    lat,
    lon,
    alt_m: alt,
    groundspeed_m_s: 8 + Math.random() * 2,
    heading_deg: Math.floor(Math.random() * 360),
    battery_pct: Math.round(battery),
    satellites: 14,
    flight_mode: "LOITER",
    arm_status: "ARMED",
    gps_status: "3D Lock",
    status_text: "OK",
  };
}

async function postTelemetry(payload) {
  try {
    const res = await fetch(`${TARGET_URL}/api/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn("Telemetry post failed:", res.status, body);
    }
  } catch (err) {
    console.error("Telemetry post error:", err);
  }
}

console.log("Simulator starting. Posting telemetry to:", `${TARGET_URL}/api/telemetry`);
setInterval(() => {
  randomWalk();
  const msg = generateTelemetry();
  postTelemetry(msg);
}, INTERVAL);

// keep process alive
process.stdin.resume();
