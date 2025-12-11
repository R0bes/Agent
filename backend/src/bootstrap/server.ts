/**
 * Application Server Entry Point
 * 
 * This is the new entry point for the hexagonal architecture.
 * The old server.ts will be migrated to use this bootstrap.
 */

import { bootstrap } from "./bootstrap";
import { logInfo, logError } from "../infrastructure/logging/logger";

// Bootstrap and start the application
(async () => {
  try {
    await bootstrap();
    logInfo("Server: Application started successfully");
  } catch (err) {
    logError("Server: Failed to start application", err);
    process.exit(1);
  }
})();

