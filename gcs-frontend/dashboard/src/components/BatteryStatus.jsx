import React from "react";

export default function BatteryStatus({ telemetry }) {
  // unified fields from useTelemetry.js
  const pct = Number(telemetry?.batteryPct ?? 0);
  const voltage = telemetry?.voltage ?? 0;

  // clamp % between 0 and 100
  const pctClamped = Math.max(0, Math.min(100, pct));

  return (
    <div className="panel">
      <h3>Battery Status</h3>

      <div style={{ marginTop: 10 }}>
        {/* BATTERY BAR */}
        <div className="batt-bar">
          <div
            className="batt-fill"
            style={{
              width: `${pctClamped}%`,
              backgroundColor: pctClamped < 20 ? "#ff4d4d" : "#31e27c",
              transition: "width 0.3s",
            }}
          />
        </div>

        {/* TEXT ROW */}
        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            padding: "0 4px",
          }}
        >
          <div style={{ fontSize: "14px", color: "#9bb8c5" }}>
            Voltage: {voltage ? `${voltage.toFixed(2)}V` : "0.00V"}
          </div>

          <div
            style={{
              color: pctClamped < 20 ? "#ff6565" : "#31e27c",
              fontWeight: 600,
            }}
          >
            {pctClamped > 0 ? `${pctClamped.toFixed(1)}%` : "Critical"}
          </div>
        </div>
      </div>
    </div>
  );
}
