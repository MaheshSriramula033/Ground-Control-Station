import React from 'react';
import DroneMap from './components/DroneMap';
import BatteryGauge from './components/BatteryGauge';
import MissionStatus from './components/MissionStatus';
import TelemetryCharts from './components/TelemetryCharts';
import VideoStreamer from './components/VideoStreamer';
import VideoViewer from './components/VideoViewer';
import NetworkStatus from './components/NetworkStatus';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="app-header">
        <h1 > Ground Control Station</h1>
      </header>
      
      <div className="dashboard">
        {/* Top Row: Map and Status Side by Side */}
        <div className="row">
          <div className="col map-container">
            <DroneMap />
          </div>
          <div className="col status-container">
            <MissionStatus />
            <BatteryGauge />
          </div>
        </div>
        
        {/* Middle Row: Telemetry Charts */}
        <div className="row">
          <div className="col">
            <TelemetryCharts />
          </div>
        </div>
        
        {/* Bottom Row: Video Streaming */}
        <div className="row">
          <div className="col video-section">
            <h2>Live Video Streaming</h2>
            <div className="video-container">
              <div className="video-component">
                <VideoStreamer />
              </div>
              <div className="video-component">
                <VideoViewer />
              </div>

              <div className="row">
  <div className="col">
    <NetworkStatus />
  </div>
</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;