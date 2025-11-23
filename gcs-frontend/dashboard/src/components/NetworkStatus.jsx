import React from "react";

export default function NetworkStatus({ network }) {

  const netType = network?.network ?? "—";
  const vpnStatus = network?.vpn ?? "disconnected";
  const latency = network?.latency ?? 0;
  const jitter = network?.jitter ?? 0;
  const loss = network?.loss ?? 0;

  return (
    <div className="network-card">
      <h3 className="network-title">Network Status</h3>

      {/* --- NETWORK TYPE --- */}
      <div className="network-row">
        <div className="label">Network</div>
        <div className="value">{netType}</div>
      </div>

      {/* --- VPN Status --- */}
      <div className="network-row">
        <div className="label">VPN</div>
        <div className={`value ${vpnStatus === "connected" ? "ok" : "bad"}`}>
          {vpnStatus}
        </div>
      </div>

      <div className="divider" />

      {/* --- Latency / Jitter / Loss --- */}
      <div className="network-stats">
        <div className="stats-col">
          <div className="stats-label">Latency</div>
          <div className="stats-value">{latency} ms</div>
        </div>

        <div className="stats-col">
          <div className="stats-label">Jitter</div>
          <div className="stats-value">{jitter} ms</div>
        </div>

        <div className="stats-col">
          <div className="stats-label">Loss</div>
          <div className="stats-value">{loss}%</div>
        </div>
      </div>

      <div className="divider" />

      {/* --- Link Type --- */}
      <div className="network-footer">
        <div className="footer-label">Simulated Link:</div>
        <div className="footer-value">
          {netType === "WiFi" ? "Local (WiFi)" : "Remote (ZeroTier)"}
        </div>
      </div>
    </div>
  );
}
