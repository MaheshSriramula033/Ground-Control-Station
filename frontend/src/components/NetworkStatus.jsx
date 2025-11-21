import React, { useEffect, useState } from 'react';
const WS_URL = import.meta.env.VITE_TELEMETRY_WS;

const NetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState(null);
  const [lteStatus, setLteStatus] = useState(null);
  const [switchingStatus, setSwitchingStatus] = useState(null);

  useEffect(() => {
    // Listen for network status updates
    const handleNetworkMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'network_status') {
          setNetworkStatus(data.data.network);
          setLteStatus(data.data.lte);
          setSwitchingStatus(data.data.switching);
        }
      } catch (error) {
        console.error('Error parsing network status:', error);
      }
    };

    // This would be connected to your WebSocket
    // For now, we'll simulate updates
    const ws = new WebSocket( WS_URL);
    ws.onmessage = handleNetworkMessage;

    return () => ws.close();
  }, []);

  const getNetworkIcon = (type) => {
    switch (type) {
      case 'wifi': return '📶';
      case 'lte': return '📱';
      case 'ethernet': return '🔌';
      case 'vpn': return '🛡️';
      default: return '❓';
    }
  };

  const getSignalColor = (strength) => {
    if (strength > 70) return '#4CAF50';
    if (strength > 40) return '#FF9800';
    return '#F44336';
  };

  if (!networkStatus) {
    return (
      <div style={{ 
        padding: '15px', 
        background: '#1e1e1e', 
        borderRadius: '8px',
        color: 'white',
        margin: '10px 0'
      }}>
        Loading network status...
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '15px', 
      background: '#1e1e1e', 
      borderRadius: '8px',
      color: 'white',
      margin: '10px 0'
    }}>
      <h3 style={{ marginBottom: '15px', color: '#00D4FF' }}>🌐 Network Status</h3>
      
      {/* Current Network */}
      <div style={{ marginBottom: '15px' }}>
        <h4>Current Connection</h4>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          padding: '10px',
          background: '#2a2a2a',
          borderRadius: '6px'
        }}>
          <span style={{ fontSize: '24px' }}>
            {getNetworkIcon(networkStatus.current?.type)}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold' }}>
              {networkStatus.current?.type?.toUpperCase() || 'Unknown'}
            </div>
            <div style={{ fontSize: '12px', color: '#aaa' }}>
              {networkStatus.current?.address} • {networkStatus.current?.interface}
            </div>
          </div>
          <div style={{ 
            color: getSignalColor(networkStatus.current?.strength),
            fontWeight: 'bold'
          }}>
            {networkStatus.current?.strength}%
          </div>
        </div>
      </div>

      {/* LTE Status */}
      {lteStatus && (
        <div style={{ marginBottom: '15px' }}>
          <h4>LTE Modem</h4>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            padding: '10px',
            background: '#2a2a2a',
            borderRadius: '6px'
          }}>
            <span style={{ fontSize: '24px' }}>📱</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>
                {lteStatus.connected ? 'CONNECTED' : 'DISCONNECTED'}
              </div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>
                {lteStatus.operator} • {lteStatus.networkType}
              </div>
            </div>
            <div style={{ 
              color: getSignalColor(lteStatus.signalStrength),
              fontWeight: 'bold'
            }}>
              {lteStatus.signalStrength}%
            </div>
          </div>
        </div>
      )}

      {/* Switching Status */}
      {switchingStatus && (
        <div>
          <h4>Network Switching</h4>
          <div style={{ 
            padding: '10px',
            background: '#2a2a2a',
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            <div>Mode: <strong>{switchingStatus.currentMode}</strong></div>
            <div>Threshold: <strong>{switchingStatus.switchThreshold}%</strong></div>
            {switchingStatus.switchHistory.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#aaa' }}>
                Last switch: {switchingStatus.switchHistory[0].from} → {switchingStatus.switchHistory[0].to}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkStatus;