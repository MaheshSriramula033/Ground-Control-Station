import React from 'react';

function Item({ label, value }) {
  return (
    <div className="mission-item">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

export default function MissionStatus({ telemetry, connectionStatus }) {

  if (!telemetry) {
    return (
      <div className="panel">
        <h3>Mission Status</h3>
        <Item label="Flight Mode:" value="—" />
        <Item label="Arm Status:" value="—" />
        <Item label="GPS Status:" value="—" />
        <Item label="Satellites:" value="—" />
        <Item label="Altitude:" value="0.0 m" />
        <Item label="Speed:" value="0.0 m/s" />
        <Item label="Heading:" value="0°" />
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>Mission Status</h3>

      {/* USE UNIFIED FIELD NAMES */}
      <Item label="Flight Mode:" value={telemetry.flightMode ?? 'UNKNOWN'} />
      <Item label="Arm Status:" value={telemetry.armStatus ?? 'DISARMED'} />
      <Item label="GPS Status:" value={telemetry.gpsStatus ?? 'No Lock'} />
      <Item label="Satellites:" value={telemetry.satellites ?? 0} />
      <Item label="Altitude:" value={`${(telemetry.altitude ?? 0).toFixed(1)} m`} />
      <Item label="Speed:" value={`${(telemetry.speed ?? 0).toFixed(1)} m/s`} />
      <Item label="Heading:" value={`${parseInt(telemetry.heading ?? 0)}°`} />
    </div>
  );
}
