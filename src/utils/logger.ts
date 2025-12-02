/**
 * Custom Logger
 * Simple, lightweight logger with log levels
 * Zero dependencies, optimized for performance
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LoggerConfig {
  level?: LogLevel;
  enableTimestamp?: boolean;
}

/**
 * Logger interface for dependency injection
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}

/**
 * Simple logger implementation
 */
export class Logger implements ILogger {
  private level: LogLevel;
  private prefix: string;
  private enableTimestamp: boolean;

  constructor(prefix: string, config: LoggerConfig = {}) {
    this.prefix = prefix;
    this.level = config.level ?? LogLevel.INFO;
    this.enableTimestamp = config.enableTimestamp ?? false;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log('DEBUG', message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      this.log('INFO', message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      this.log('WARN', message, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      this.log('ERROR', message, ...args);
    }
  }

  private log(level: string, message: string, ...args: any[]): void {
    const timestamp = this.enableTimestamp ? `${new Date().toISOString()} ` : '';
    const prefix = `[${this.prefix}]`;

    const fullMessage = `${timestamp}${prefix} ${message}`;

    // Route to appropriate console method
    if (level === 'ERROR') {
      console.error(fullMessage, ...args);
    } else if (level === 'WARN') {
      console.warn(fullMessage, ...args);
    } else {
      console.log(fullMessage, ...args);
    }
  }
}

/**
 * No-op logger for testing or silent mode
 */
export class SilentLogger implements ILogger {
  debug(_message: string, ..._args: any[]): void {}
  info(_message: string, ..._args: any[]): void {}
  warn(_message: string, ..._args: any[]): void {}
  error(_message: string, ..._args: any[]): void {}
  setLevel(_level: LogLevel): void {}
  getLevel(): LogLevel {
    return LogLevel.SILENT;
  }
}

/**
 * Create a logger instance
 */
export function createLogger(prefix: string, config?: LoggerConfig): ILogger {
  return new Logger(prefix, config);
}

/**
 * Global log level - can be set by environment variable
 */
export function getDefaultLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  switch (envLevel) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    case 'SILENT':
      return LogLevel.SILENT;
    default:
      return LogLevel.INFO;
  }
}

