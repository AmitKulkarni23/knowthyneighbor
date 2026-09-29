type LogContext = Record<string, unknown>;

function format(level: string, message: string, context?: LogContext) {
  const entry = { level, message, timestamp: new Date().toISOString(), ...context };
  return JSON.stringify(entry);
}

export const logger = {
  error(message: string, context?: LogContext) {
    console.error(format('error', message, context));
  },
  warn(message: string, context?: LogContext) {
    console.warn(format('warn', message, context));
  },
  info(message: string, context?: LogContext) {
    console.info(format('info', message, context));
  },
};
