import dotenv from "dotenv";
dotenv.config();

export default {
  PORT: process.env.PORT || 3000,
  WS_PORT: process.env.WS_PORT || 3000,
  MAV_UDP_PORT: process.env.MAV_UDP_PORT || 14550,
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
};
