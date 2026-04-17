import Redis from "ioredis";

let redisClient = null;

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true
  });

  redisClient.on("error", (error) => {
    // eslint-disable-next-line no-console
    console.error("Redis error:", error.message);
  });
}

export function getRedisClient() {
  return redisClient;
}
