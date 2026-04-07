export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: Record<string, unknown>;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

let minLevel: LogLevel = LogLevel.INFO;

export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}

function emit(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  if (entry.level === LogLevel.ERROR) {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export class Logger {
  private component: string;

  constructor(component: string) {
    this.component = component;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (!shouldLog(LogLevel.DEBUG)) return;
    emit({ timestamp: new Date().toISOString(), level: LogLevel.DEBUG, component: this.component, message, data });
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (!shouldLog(LogLevel.INFO)) return;
    emit({ timestamp: new Date().toISOString(), level: LogLevel.INFO, component: this.component, message, data });
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (!shouldLog(LogLevel.WARN)) return;
    emit({ timestamp: new Date().toISOString(), level: LogLevel.WARN, component: this.component, message, data });
  }

  error(message: string, data?: Record<string, unknown>): void {
    if (!shouldLog(LogLevel.ERROR)) return;
    emit({ timestamp: new Date().toISOString(), level: LogLevel.ERROR, component: this.component, message, data });
  }
}
