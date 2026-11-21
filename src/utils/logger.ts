import { LogEvent, LogLevel } from '../constants/logging';

type LogContextValue = string | number | boolean | undefined;
type LogContext = Record<string, LogContextValue>;

function writeLog(level: LogLevel, event: LogEvent, context: LogContext = {}): void {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  });

  if (level === LogLevel.Error) {
    console.error(entry);
    return;
  }
  console.log(entry);
}

function errorContext(error: unknown): LogContext {
  if (!(error instanceof Error)) {
    return {
      error: String(error),
    };
  }

  return {
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
  };
}

export function logInfo(event: LogEvent, context: LogContext = {}): void {
  writeLog(LogLevel.Info, event, context);
}

export function logError(event: LogEvent, error?: unknown, context: LogContext = {}): void {
  writeLog(LogLevel.Error, event, {
    ...context,
    ...(error === undefined ? {} : errorContext(error)),
  });
}
