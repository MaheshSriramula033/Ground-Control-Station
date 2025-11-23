// frontend/src/components/TelemetryCharts.jsx
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function TelemetryCharts({ recent }) {
  console.log("📊 chart recent[] =", recent);

  return (
    <div style={{ padding: "20px" }}>
      <h2 className="charts-title">Real-Time Telemetry Charts</h2>

      <div
        className="charts-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        {/* ALTITUDE */}
        <div className="chart-box">
          <h3 style={{ marginBottom: "10px", color: "#8fd3ff" }}>Altitude (m)</h3>
          <div
            style={{
              width: "100%",
              height: "220px",
              background: "#07202b",
              borderRadius: "8px",
              padding: "10px",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recent}>
                <CartesianGrid strokeDasharray="3 3" stroke="#234" />
                <XAxis dataKey="time" tick={{ fill: "#aac" }} />
                <YAxis tick={{ fill: "#aac" }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="altitude"
                  stroke="#00d4ff"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SPEED */}
        <div className="chart-box">
          <h3 style={{ marginBottom: "10px", color: "#8fd3ff" }}>Speed (m/s)</h3>
          <div
            style={{
              width: "100%",
              height: "220px",
              background: "#07202b",
              borderRadius: "8px",
              padding: "10px",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recent}>
                <CartesianGrid strokeDasharray="3 3" stroke="#234" />
                <XAxis dataKey="time" tick={{ fill: "#aac" }} />
                <YAxis tick={{ fill: "#aac" }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
