/**
 * Tool Entity
 * 
 * Domain entity representing a tool
 */

export interface ToolParameters {
  type: "object";
  properties: Record<string, any>;
  required?: string[];
}

export interface ToolExample {
  input: Record<string, unknown>;
  output: {
    ok: boolean;
    data?: unknown;
    error?: string;
  };
  description?: string;
}

export class Tool {
  constructor(
    public readonly name: string,
    public readonly shortDescription: string,
    public readonly description: string,
    public readonly parameters: ToolParameters,
    public readonly examples?: ToolExample[]
  ) {}

  /**
   * Validate tool arguments against parameters
   */
  validateArgs(args: Record<string, unknown>): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Check required parameters
    if (this.parameters.required) {
      for (const required of this.parameters.required) {
        if (!(required in args)) {
          errors.push(`Missing required parameter: ${required}`);
        }
      }
    }

    // Check parameter types (basic validation)
    for (const [key, value] of Object.entries(args)) {
      const paramDef = this.parameters.properties[key];
      if (!paramDef) {
        // Allow additional properties if not explicitly forbidden
        continue;
      }

      const expectedType = paramDef.type;
      if (expectedType) {
        const actualType = typeof value;
        if (expectedType === "string" && actualType !== "string") {
          errors.push(`Parameter ${key} must be a string`);
        } else if (expectedType === "number" && actualType !== "number") {
          errors.push(`Parameter ${key} must be a number`);
        } else if (expectedType === "boolean" && actualType !== "boolean") {
          errors.push(`Parameter ${key} must be a boolean`);
        } else if (expectedType === "array" && !Array.isArray(value)) {
          errors.push(`Parameter ${key} must be an array`);
        } else if (expectedType === "object" && (actualType !== "object" || Array.isArray(value) || value === null)) {
          errors.push(`Parameter ${key} must be an object`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}

