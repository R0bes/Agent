/**
 * Delete Task Use Case
 * 
 * Deletes a scheduled task
 */

import type { ISchedulerPort } from "../../../ports/input/ISchedulerPort";

export class DeleteTaskUseCase {
  constructor(
    private readonly schedulerPort: ISchedulerPort
  ) {}

  async execute(taskId: string): Promise<void> {
    await this.schedulerPort.deleteTask(taskId);
  }
}

