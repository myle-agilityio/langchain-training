export type LogLevel = "info" | "warn" | "error";

export interface LogContext {
  code?: string;
  requestId?: string;
  url?: string;
  status?: number;
  detail?: string;
}

// Same JSON shape the agent writes, so browser and server lines read alike. The one place to
// attach Sentry/Datadog later — nothing else in the app should call console directly.
const write = (level: LogLevel, message: string, context: LogContext = {}) => {
  const entry = { timestamp: new Date().toISOString(), level, message };
  const line = JSON.stringify(
    Object.fromEntries(
      Object.entries({ ...entry, ...context }).filter(
        ([, value]) => value !== undefined,
      ),
    ),
  );

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
};

export const logInfo = (message: string, context?: LogContext) =>
  write("info", message, context);

export const logWarn = (message: string, context?: LogContext) =>
  write("warn", message, context);

export const logError = (message: string, context?: LogContext) =>
  write("error", message, context);
