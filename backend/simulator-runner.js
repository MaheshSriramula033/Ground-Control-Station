module.exports = () => {
  try {
    console.log("🚁 Launching Drone Telemetry Simulator...");
    require("../simulator/index.js");
  } catch (err) {
    console.error("❌ Failed to launch simulator:", err.message);
  }
};
