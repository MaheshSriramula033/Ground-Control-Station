// backend/src/network/network_simulator.js
import { publishNetworkStatus } from "../websocket/telemetry_ws.js";

/**
 * Simulated network layer to emulate:
 * - VPN connect/disconnect
 * - network type (WiFi / LTE / 4G)
 * - latency, jitter, packet loss (randomized)
 *
 * Call startNetworkSimulator() from server.js
 */

const NETWORK_TYPES = ["WiFi", "LTE", "4G"];
let intervalRef = null;

function randomFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function startNetworkSimulator() {
  if (intervalRef) return; // already running

  // initial state
  let vpnConnected = true;
  let currentNetwork = randomChoice(NETWORK_TYPES);

  intervalRef = setInterval(() => {
    // occasionally toggle VPN (rare)
    if (Math.random() < 0.05) vpnConnected = !vpnConnected;

    // occasionally change network type (e.g., handover between WiFi and LTE)
    if (Math.random() < 0.15) currentNetwork = randomChoice(NETWORK_TYPES);

    // simulated metrics depend on network type
    let baseLatency = currentNetwork === "WiFi" ? 20 : currentNetwork === "LTE" ? 70 : 90;
    let latency = Math.max(5, randomFloat(baseLatency - 10, baseLatency + 30, 0));
    let jitter = Math.max(0.5, randomFloat(1, 10, 1));
    let loss = Number(randomFloat(0, 1.5, 2)); // percent

    const payload = {
      vpn: vpnConnected ? "connected" : "disconnected",
      network: currentNetwork,
      latency, // ms
      jitter,  // ms
      loss,    // %
      ts: Date.now()
    };

    publishNetworkStatus(payload);
  }, 2000);

  console.log("Network simulator started (simulating VPN/4G/WiFi)");
}

export function stopNetworkSimulator() {
  if (!intervalRef) return;
  clearInterval(intervalRef);
  intervalRef = null;
  console.log("Network simulator stopped");
}
