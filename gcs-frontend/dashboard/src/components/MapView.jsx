import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const droneIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function MapView({ telemetry }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('mapid', { center: [17.3850, 78.4867], zoom: 14, zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);

      markerRef.current = L.marker([17.3850, 78.4867], { icon: droneIcon }).addTo(mapRef.current);
    }

    return () => {};
  }, []);

  useEffect(() => {
    if (telemetry && telemetry.lat && telemetry.lon) {
      const lat = Number(telemetry.lat);
      const lon = Number(telemetry.lon);
      markerRef.current.setLatLng([lat, lon]);
      mapRef.current.panTo([lat, lon]);
      markerRef.current.bindPopup(`Drone\n${lat.toFixed(6)} | ${lon.toFixed(6)}`).openPopup();
    }
  }, [telemetry]);

  return <div id="mapid" style={{ height: '450px', width: '100%', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }} />;
}
