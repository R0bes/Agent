import type { FastifyInstance } from "fastify";
import { logInfo, logDebug, getLogs } from "../utils/logger";
import { getLogManager } from "../utils/logManager";
import type { LogLevel } from "../utils/logFormat";

export async function registerLogsRoutes(app: FastifyInstance) {
  app.get("/api/logs", async (req, reply) => {
    const level = req.query.level as LogLevel | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    logDebug("Logs API: Request received", {
      level,
      limit,
      requestId: req.id
    });

    const logs = getLogs(level);

    // Apply limit if specified
    const resultLogs = limit ? logs.slice(-limit) : logs;

    logInfo("Logs API: Logs retrieved", {
      count: resultLogs.length,
      totalCount: logs.length,
      level,
      requestId: req.id
    }, {
      requestId: req.id
    });

    return reply.send({ logs: resultLogs, total: logs.length });
  });

  app.delete("/api/logs", async (req, reply) => {
    logDebug("Logs API: Clear request received", {
      requestId: req.id
    });

    const logManager = getLogManager();
    logManager.clearLogs();

    logInfo("Logs API: Logs cleared", {
      requestId: req.id
    }, {
      requestId: req.id
    });

    return reply.send({ success: true, message: "Logs cleared" });
  });
}

