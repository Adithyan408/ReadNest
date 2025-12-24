// config/redis.js
import { createClient } from "redis";

const redisClient = createClient({
  socket: {
    host: "127.0.0.1", // FORCE IPv4
    port: 6379,
  },
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

await redisClient.connect();

export default redisClient;
