/**
 * Scheduler Module
 * 
 * Exportiert Scheduler Service für automatische Task-Ausführung
 */

export { ThreadedSchedulerService } from "./schedulerService";

// Legacy export for compatibility (will be removed)
// Note: schedulerService singleton is no longer used - use Execution Service instead
export { ThreadedSchedulerService as SchedulerService };

