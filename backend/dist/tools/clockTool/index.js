export const clockTool = {
    name: "get_time",
    shortDescription: "Get the current server time in ISO format.",
    description: "Returns the current server time in ISO 8601 format (e.g., '2024-01-15T10:30:00.000Z'). This tool is useful when you need to know the current date and time, for example to schedule tasks, log timestamps, or provide time-sensitive information to users. The time is always returned in UTC timezone.",
    parameters: {
        type: "object",
        properties: {},
        additionalProperties: false
    },
    examples: [
        {
            input: {},
            output: {
                ok: true,
                data: {
                    now: "2024-01-15T10:30:00.000Z"
                }
            },
            description: "Basic usage to get current time"
        }
    ],
    async execute(_args, _ctx) {
        return {
            ok: true,
            data: {
                now: new Date().toISOString()
            }
        };
    }
};
