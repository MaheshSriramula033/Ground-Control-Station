import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
const WS_URL = import.meta.env.VITE_TELEMETRY_WS;


const TelemetryCharts = () => {
  const [altitudeData, setAltitudeData] = useState([]);
  const [speedData, setSpeedData] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const maxDataPoints = 20;

  useEffect(() => {
    let ws;
    
    try {
      console.log('📈 TelemetryCharts: Connecting to telemetry server...');
      ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        setConnectionStatus('Connected');
        console.log('✅ TelemetryCharts: WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 TelemetryCharts: Received data type:', data.type);
          
          if (data.type === 'telemetry') {
            const timestamp = new Date().toLocaleTimeString();
            
            // Update altitude chart
            setAltitudeData(prev => {
              const newData = [...prev, { 
                time: timestamp, 
                altitude: parseFloat(data.data.altitude.toFixed(1)) 
              }];
              return newData.slice(-maxDataPoints);
            });
            
            // Update speed chart
            setSpeedData(prev => {
              const newData = [...prev, { 
                time: timestamp, 
                speed: parseFloat(data.data.groundSpeed.toFixed(1)) 
              }];
              return newData.slice(-maxDataPoints);
            });
          }
        } catch (error) {
          console.error('❌ TelemetryCharts: Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        setConnectionStatus('Error');
        console.error('❌ TelemetryCharts: WebSocket error:', error);
      };

      ws.onclose = () => {
        setConnectionStatus('Disconnected');
        console.log('🔌 TelemetryCharts: WebSocket disconnected');
      };

    } catch (error) {
      console.error('❌ TelemetryCharts: Connection failed:', error);
      setConnectionStatus('Error');
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  return (
    <div className="col">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Real-Time Telemetry Charts</h3>
        <div style={{ 
          padding: '0.3rem 0.8rem', 
          borderRadius: '4px', 
          backgroundColor: connectionStatus === 'Connected' ? '#4CAF50' : '#f44336',
          color: 'white',
          fontSize: '0.8rem',
          fontWeight: 'bold'
        }}>
          {connectionStatus}
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h4 style={{ textAlign: 'center', color: '#88aacc', marginBottom: '1rem' }}>Altitude (meters)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={altitudeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: '#88aacc' }} 
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: '#88aacc' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e1e1e', 
                  border: '1px solid #444',
                  color: '#fff'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="altitude" 
                stroke="#00d4ff" 
                strokeWidth={2}
                dot={false} 
                activeDot={{ r: 4, fill: '#0099ff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div>
          <h4 style={{ textAlign: 'center', color: '#88aacc', marginBottom: '1rem' }}>Speed (m/s)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={speedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: '#88aacc' }} 
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 10, fill: '#88aacc' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e1e1e', 
                  border: '1px solid #444',
                  color: '#fff'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="speed" 
                stroke="#82ca9d" 
                strokeWidth={2}
                dot={false} 
                activeDot={{ r: 4, fill: '#4CAF50' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {altitudeData.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          color: '#88aacc', 
          fontStyle: 'italic',
          marginTop: '2rem'
        }}>
          Waiting for telemetry data... Check if backend server is running on port 8082
        </div>
      )}
    </div>
  );
};

export default TelemetryCharts;