/**
 * Tool Result Value Object
 * 
 * Immutable value object representing the result of tool execution
 */

export class ToolResult {
  constructor(
    public readonly ok: boolean,
    public readonly data?: unknown,
    public readonly error?: string
  ) {}

  /**
   * Create a successful result
   */
  static success(data?: unknown): ToolResult {
    return new ToolResult(true, data);
  }

  /**
   * Create a failed result
   */
  static failure(error: string): ToolResult {
    return new ToolResult(false, undefined, error);
  }

  /**
   * Check if result is successful
   */
  isSuccess(): boolean {
    return this.ok;
  }

  /**
   * Check if result is failure
   */
  isFailure(): boolean {
    return !this.ok;
  }
}

