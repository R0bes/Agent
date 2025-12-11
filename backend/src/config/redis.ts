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

  const MAX_RETRY_ATTEMPTS = parseInt(process.env.REDIS_MAX_RETRIES || "5");
  
  const redis = new Redis({
    host,
    port,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      if (times > MAX_RETRY_ATTEMPTS) {
        logError("Redis: Max retry attempts reached, giving up", {
          attempts: times,
          maxAttempts: MAX_RETRY_ATTEMPTS
        });
        logWarn("Redis: To start Redis, run: docker compose -f devops/docker-compose.yml up -d redis");
        return null; // Stop retrying
      }
      const delay = Math.min(times * 50, 2000);
      if (times <= 3 || times % 5 === 0) { // Log first 3 attempts, then every 5th
        logInfo("Redis: Retrying connection", {
          attempt: times,
          maxAttempts: MAX_RETRY_ATTEMPTS,
          delay: `${delay}ms`
        });
      }
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

