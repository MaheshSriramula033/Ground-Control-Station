import dgram from "dgram";
import config from "../config/config.js";

const socket = dgram.createSocket("udp4");

let lat = 17.384508;
let lon = 78.487118;
let alt = 430;
let battery = 100;

function randomWalk() {
  lat += (Math.random() - 0.5) * 0.0003;
  lon += (Math.random() - 0.5) * 0.0003;
  alt += (Math.random() - 0.5) * 0.4;

  // ⭐ SLOW + REALISTIC battery drain ⭐
  const drain = Math.random() * 0.15 + 0.05;  // 0.05% – 0.20% per second
  const noise = (Math.random() - 0.5) * 0.05; // tiny jitter

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
    battery_pct: battery,
    satellites: 14,
    flight_mode: "LOITER",
    arm_status: "ARMED",
    gps_status: "3D Lock",
    status_text: "OK",
  };
}

export function startSimulator({
  targetHost = "127.0.0.1",
  targetPort = config.MAV_UDP_PORT,
  interval = 1000,
} = {}) {
  console.log(`Simulator streaming to ${targetHost}:${targetPort}`);

  setInterval(() => {
    randomWalk();
    const msg = Buffer.from(JSON.stringify(generateTelemetry()));
    socket.send(msg, targetPort, targetHost);
  }, interval);
}
