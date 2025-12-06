/**
 * Redis Connection Configuration
 * 
 * Provides Redis connection for BullMQ and other services.
 */

import Redis from "ioredis";
import { logInfo, logError } from "../utils/logger";

export function createRedisConnection(): Redis {
  const host = process.env.REDIS_HOST || "localhost";
  const port = parseInt(process.env.REDIS_PORT || "6379");

  logInfo("Redis: Creating connection", {
    host,
    port
  });

  const redis = new Redis({
    host,
    port,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      logInfo("Redis: Retrying connection", {
        attempt: times,
        delay: `${delay}ms`
      });
      return delay;
    }
  });

  redis.on("error", (err) => {
    logError("Redis: Connection error", err);
  });

  redis.on("connect", () => {
    logInfo("Redis: Connected successfully");
  });

  return redis;
}

