/**
 * Scheduler Service (Threaded)
 * 
 * Prüft alle enabled Tasks jede Minute und führt sie aus, wenn die Zeit gekommen ist.
 * Nutzt Worker Manager zur Ausführung von Tasks.
 */

import { ThreadedService } from "../base/ThreadedService";
import { scheduleStore, type ScheduledTask } from "../../legacy/models/scheduleStore";
import cronParser from "cron-parser";
import type { BaseEvent, EventType } from "../../events/eventBus";
import { logInfo, logDebug, logError } from "../../utils/logger";

const parseExpression = cronParser.parseExpression;

export class ThreadedSchedulerService extends ThreadedService {
  readonly id = "scheduler";
  readonly name = "Scheduler Service";

  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Event types this service subscribes to
   */
  protected getSubscribedEvents(): EventType[] {
    return []; // Scheduler doesn't subscribe to events
  }

  /**
   * Service initialization (runs in thread)
   */
  protected async onCustomInitialize(): Promise<void> {
    // Initialize Postgres pool in this worker thread
    try {
      const { createPostgresPool } = await import("../../database/postgres.js");
      await createPostgresPool();
      this.logInfo("Postgres pool initialized in worker thread");
    } catch (err) {
      this.logError("Failed to initialize Postgres pool", err);
      throw err;
    }
    
    await this.start();
  }

  /**
   * Service shutdown (runs in thread)
   */
  protected async onCustomShutdown(): Promise<void> {
    await this.stop();
  }

  /**
   * Handle direct service calls (runs in thread)
   */
  protected async onMessage(message: { method: string; args: any }): Promise<any> {
    switch (message.method) {
      case "start":
        return await this.start();
      case "stop":
        return await this.stop();
      case "checkAndExecuteTasks":
        return await this.checkAndExecuteTasks();
      default:
        throw new Error(`Unknown method: ${message.method}`);
    }
  }

  /**
   * Handle events (runs in thread)
   */
  protected async onEvent(event: BaseEvent): Promise<void> {
    // Scheduler doesn't handle events
  }

  /**
   * Startet den Scheduler Service
   * Prüft jede Minute, ob Tasks ausgeführt werden müssen
   */
  private async start(): Promise<void> {
    if (this.isRunning) {
      logInfo("Scheduler Service: Already running");
      return;
    }

    this.isRunning = true;
    logInfo("Scheduler Service: Starting");

    // Prüfe sofort beim Start
    await this.checkAndExecuteTasks();

    // Dann jede Minute prüfen
    this.intervalId = setInterval(async () => {
      await this.checkAndExecuteTasks();
    }, 60000); // 60 Sekunden = 1 Minute

    logInfo("Scheduler Service: Started (checking every minute)");
  }

  /**
   * Stoppt den Scheduler Service
   */
  private async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    logInfo("Scheduler Service: Stopped");
  }

  /**
   * Prüft alle enabled Tasks und führt sie aus, wenn die Zeit gekommen ist
   */
  private async checkAndExecuteTasks(): Promise<void> {
    const tasks = await scheduleStore.list({ enabled: true });
    const now = new Date();

    logDebug("Scheduler Service: Checking tasks", {
      taskCount: tasks.length,
      currentTime: now.toISOString()
    });

    for (const task of tasks) {
      try {
        if (await this.shouldRun(task, now)) {
          await this.executeTask(task);
        }
      } catch (err) {
        logError("Scheduler Service: Error checking/executing task", err, {
          taskId: task.id
        });
      }
    }
  }

  /**
   * Prüft, ob ein Task jetzt ausgeführt werden sollte
   */
  private async shouldRun(task: ScheduledTask, now: Date): Promise<boolean> {
    try {
      // Prüfe, ob nextRun bereits erreicht wurde
      if (task.nextRun) {
        const nextRunDate = new Date(task.nextRun);
        const lastRun = task.lastRun ? new Date(task.lastRun) : null;

        // Führe aus, wenn:
        // 1. Die nächste Laufzeit erreicht oder überschritten wurde
        // 2. UND der Task noch nicht in dieser Minute ausgeführt wurde
        if (nextRunDate <= now) {
          if (!lastRun || (now.getTime() - lastRun.getTime()) > 60000) {
            return true;
          }
        }
      } else {
        // Wenn nextRun nicht gesetzt ist, berechne es basierend auf der Cron-Expression
        const interval = parseExpression(task.schedule, {
          currentDate: now,
          tz: "UTC"
        });
        const nextRun = interval.next().toDate();
        const lastRun = task.lastRun ? new Date(task.lastRun) : null;

        if (nextRun <= now) {
          if (!lastRun || (now.getTime() - lastRun.getTime()) > 60000) {
            return true;
          }
        }
      }

      return false;
    } catch (err) {
      logError("Scheduler Service: Error parsing cron expression", err, {
        taskId: task.id,
        schedule: task.schedule
      });
      return false;
    }
  }

  /**
   * Führt einen Task aus
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    logInfo("Scheduler Service: Executing task", {
      taskId: task.id,
      type: task.type,
      schedule: task.schedule
    });

    try {
      if (task.type === "tool_call") {
        // Tool über Worker Manager ausführen
        if (!task.payload.toolName) {
          throw new Error("Tool name missing in payload");
        }

        // Rufe Worker Manager auf, um Task zu enqueuen
        const { workerManagerToolSet } = await import("../toolbox/workerManagerToolSet");
        await workerManagerToolSet.enqueueScheduledTask(
          task.id,
          task.payload.toolName,
          task.payload.args || {},
          task.payload.eventTopic,
          task.userId,
          task.conversationId
        );

        logInfo("Scheduler Service: Task enqueued for execution", {
          taskId: task.id,
          toolName: task.payload.toolName
        });

      } else if (task.type === "event") {
        // Event direkt über EventBus emittieren
        const { eventBus } = await import("../../events/eventBus");
        await eventBus.emit({
          type: task.payload.eventTopic,
          payload: {
            taskId: task.id,
            ...task.payload.eventPayload
          }
        });

        logInfo("Scheduler Service: Event emitted", {
          taskId: task.id,
          eventTopic: task.payload.eventTopic
        });
      }

      // lastRun und nextRun aktualisieren
      const now = new Date().toISOString();
      await scheduleStore.updateLastRun(task.id, now);

      // Nächste Laufzeit berechnen
      try {
        const interval = parseExpression(task.schedule);
        const nextRun = interval.next().toDate().toISOString();
        await scheduleStore.updateNextRun(task.id, nextRun);
      } catch (err) {
        logError("Scheduler Service: Could not calculate next run", err, {
          taskId: task.id
        });
      }

    } catch (err) {
      logError("Scheduler Service: Task execution failed", err, {
        taskId: task.id,
        type: task.type
      });
    }
  }
}

// Export service class for Execution Service registration
// Note: No singleton instance - Execution Service creates instances in threads

