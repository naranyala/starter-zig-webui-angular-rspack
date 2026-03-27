export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
export type ActiveLogLevel = Exclude<LogLevel, 'silent'>;
export type LogContext = Record<string, unknown>;

export interface LogEntry {
  id: number;
  timestamp: string;
  level: ActiveLogLevel;
  namespace: string;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerOptions {
  enabled: boolean;
  minLevel: LogLevel;
  maxEntries: number;
  redactKeys: string[];
}
