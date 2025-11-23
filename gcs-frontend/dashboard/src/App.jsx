import React from 'react';
import MapView from './components/MapView';
import MissionStatus from './components/MissionStatus';
import BatteryStatus from './components/BatteryStatus';
import TelemetryCharts from './components/TelemetryCharts';
import VideoStreamer from './components/VideoStreamer';
import VideoViewer from './components/VideoViewer';
import useTelemetry from './hooks/useTelemetry';
import NetworkStatus from './components/NetworkStatus';

export default function App() {

  // ✅ FIXED — now includes network
  const { telemetry, recent, connectionStatus, network } = useTelemetry();

  return (
    <div className="page">
      <header className="header">
        <div className="title">Ground Control Station</div>
      </header>

      <main className="container">

        <section className="top-row">
          <div className="map-card">
            <MapView telemetry={telemetry} />
          </div>

          <aside className="side-panel">
            <MissionStatus telemetry={telemetry} connectionStatus={connectionStatus} />
            <BatteryStatus telemetry={telemetry} />
          </aside>
        </section>

        <section className="charts-card">
          <TelemetryCharts recent={recent} connectionStatus={connectionStatus} />
        </section>

        <section className="video-row">
          <div className="video-column">
            <VideoStreamer />
          </div>
          <div className="video-column">
            <VideoViewer />
          </div>
        </section>

        <div className="network-wrapper-left">
          <NetworkStatus network={network} />
        </div>

      </main>

      <footer className="footer">
        <div>
          Telemetry via MAVLink (simulated) • WebSocket: ws://localhost:3000
        </div>
      </footer>
    </div>
  );
}
