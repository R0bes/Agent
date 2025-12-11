/**
 * Redis Connection
 * 
 * Infrastructure layer for Redis connection
 */

import { createRedisConnection } from "../../../config/redis";

let redisClient: ReturnType<typeof createRedisConnection> | null = null;

export function getRedisClient() {
  if (!redisClient) {
    redisClient = createRedisConnection();
  }
  return redisClient;
}

