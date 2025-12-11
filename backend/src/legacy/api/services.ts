/**
 * Services API Routes
 * 
 * API endpoints for service status and health checks.
 */

import type { FastifyInstance } from "fastify";
import { bffService } from "../services/bffService";
import { logInfo, logDebug } from "../utils/logger";

export async function registerServicesRoutes(app: FastifyInstance) {
  /**
   * GET /api/services/status - Get status of all services
   */
  app.get("/api/services/status", async (req, reply) => {
    logDebug("Services API: Status request", {
      requestId: req.id
    });

    try {
      const statuses = bffService.getAllServiceStatuses();
      
      logInfo("Services API: Status retrieved", {
        serviceCount: statuses.length,
        requestId: req.id
      });

      return reply.send({ ok: true, data: statuses });
    } catch (err) {
      logDebug("Services API: Failed to get status", {
        error: err instanceof Error ? err.message : String(err),
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: "Failed to get service status"
      });
    }
  });
}

