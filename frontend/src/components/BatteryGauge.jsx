import React, { useEffect, useState } from 'react';
const WS_URL = import.meta.env.VITE_TELEMETRY_WS;


const BatteryGauge = () => {
  const [battery, setBattery] = useState(0);
  const [voltage, setVoltage] = useState(0);

  useEffect(() => {
    const handleTelemetry = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'telemetry') {
          // Ensure battery is a valid number between 0-100
          const batteryValue = parseFloat(data.data.battery);
          if (!isNaN(batteryValue) && batteryValue >= 0 && batteryValue <= 100) {
            setBattery(batteryValue);
            // Calculate realistic voltage (3S LiPo: 9.6V - 12.6V)
            setVoltage(9.6 + (batteryValue / 100) * 3);
          }
        }
      } catch (error) {
        console.error('Error parsing battery data:', error);
      }
    };

    const ws = new WebSocket('WS_URL');
    ws.onmessage = handleTelemetry;

    return () => ws.close();
  }, []);

  const getBatteryColor = (level) => {
    if (level > 60) return '#4CAF50'; // Green
    if (level > 30) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getBatteryStatus = (level) => {
    if (level > 60) return 'Good';
    if (level > 30) return 'Warning';
    return 'Critical';
  };

  return (
    <div className="battery-gauge">
      <h3>Battery Status</h3>
      <div className="battery-level">
        <div 
          className="battery-fill"
          style={{
            width: `${battery}%`,
            backgroundColor: getBatteryColor(battery)
          }}
        >
          {battery > 10 ? `${battery.toFixed(1)}%` : ''}
        </div>
      </div>
      <div className="battery-info">
        <span>Voltage: {voltage.toFixed(2)}V</span>
        <span style={{ color: getBatteryColor(battery) }}>
          {getBatteryStatus(battery)}
        </span>
      </div>
    </div>
  );
};

export default BatteryGauge;