// run_sim.js (backend root)
import { startSimulator } from "./src/telemetry/simulator.js";
startSimulator({ targetHost: "127.0.0.1", targetPort: 14550, interval: 1000 });
