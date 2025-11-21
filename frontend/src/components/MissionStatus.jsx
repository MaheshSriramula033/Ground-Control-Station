import React, { useEffect, useState } from 'react';

const MissionStatus = () => {
  const [telemetry, setTelemetry] = useState({
    mode: 'DISCONNECTED',
    armed: false,
    satellites: 0,
    altitude: 0,
    groundSpeed: 0,
    heading: 0
  });

  useEffect(() => {
    const handleTelemetry = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'telemetry') {
          setTelemetry(data.data);
        }
      } catch (error) {
        console.error('Error parsing telemetry:', error);
      }
    };

    const ws = new WebSocket('ws://localhost:8082');
    ws.onmessage = handleTelemetry;

    return () => ws.close();
  }, []);

  const getGpsStatus = (sats) => {
    if (sats >= 10) return 'Strong Lock';
    if (sats >= 6) return 'Good Lock';
    if (sats >= 4) return 'Weak Lock';
    return 'No Lock';
  };

  return (
    <div className="mission-status-panel">
      <h3>Mission Status</h3>
      <div className="status-grid">
        <div className="status-item">
          <span className="label">Flight Mode:</span>
          <span className="value">{telemetry.mode || 'N/A'}</span>
        </div>
        <div className="status-item">
          <span className="label">Arm Status:</span>
          <span className={`value ${telemetry.armed ? 'armed' : 'disarmed'}`}>
            {telemetry.armed ? 'ARMED' : 'DISARMED'}
          </span>
        </div>
        <div className="status-item">
          <span className="label">GPS Status:</span>
          <span className="value">{getGpsStatus(telemetry.satellites)}</span>
        </div>
        <div className="status-item">
          <span className="label">Satellites:</span>
          <span className="value">{telemetry.satellites}</span>
        </div>
        <div className="status-item">
          <span className="label">Altitude:</span>
          <span className="value">{telemetry.altitude?.toFixed(1) || '0.0'} m</span>
        </div>
        <div className="status-item">
          <span className="label">Speed:</span>
          <span className="value">{telemetry.groundSpeed?.toFixed(1) || '0.0'} m/s</span>
        </div>
        <div className="status-item">
          <span className="label">Heading:</span>
          <span className="value">{telemetry.heading?.toFixed(0) || '0'}°</span>
        </div>
      </div>
    </div>
  );
};

export default MissionStatus;