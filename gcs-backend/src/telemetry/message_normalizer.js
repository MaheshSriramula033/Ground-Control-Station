export function normalizeTelemetry(raw) {
  return {
    ts: raw.ts || Date.now(),
    sysid: raw.sysid || 1,
    lat: Number(raw.lat) || 0,
    lon: Number(raw.lon) || 0,
    alt_m: raw.alt_m || raw.alt || 0,
    groundspeed_m_s: raw.groundspeed_m_s || raw.speed || 0,
    heading_deg: raw.heading_deg || raw.heading || 0,
    roll_deg: raw.roll_deg || raw.roll || 0,
    pitch_deg: raw.pitch_deg || raw.pitch || 0,
    yaw_deg: raw.yaw_deg || raw.yaw || 0,
    battery_pct: raw.battery_pct || raw.battery || null,
    satellites: raw.satellites || 12,
    flight_mode: raw.flight_mode || "UNKNOWN",
    arm_status: raw.arm_status || "UNKNOWN",
    gps_status: raw.gps_status || "UNKNOWN",
    status_text: raw.status_text || "",
  };
}
