import { publishNetworkStatus } from "../websocket/telemetry_ws.js";

const NETWORK_TYPES = ["WiFi", "LTE", "4G"];
let intervalRef = null;

function randomFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function startNetworkSimulator() {
  if (intervalRef) return;

  let vpnConnected = true;
  let currentNetwork = randomChoice(NETWORK_TYPES);

  intervalRef = setInterval(() => {
    if (Math.random() < 0.05) vpnConnected = !vpnConnected;
    if (Math.random() < 0.15) currentNetwork = randomChoice(NETWORK_TYPES);

    let baseLatency =
      currentNetwork === "WiFi"
        ? 20
        : currentNetwork === "LTE"
        ? 70
        : 90;

    const latency = Math.max(5, randomFloat(baseLatency - 10, baseLatency + 30));
    const jitter = randomFloat(1, 10);
    const loss = randomFloat(0, 1.5, 2);

    const payload = {
      vpn: vpnConnected ? "connected" : "disconnected",
      network: currentNetwork,
      latency,
      jitter,
      loss,
      ts: Date.now(),
    };

    publishNetworkStatus(payload);
  }, 2000);

  console.log("🌐 Network simulator started");
}

export function stopNetworkSimulator() {
  if (!intervalRef) return;
  clearInterval(intervalRef);
  intervalRef = null;
  console.log("Network simulator stopped");
}
