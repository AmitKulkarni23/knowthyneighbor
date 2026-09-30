import * as Sentry from '@sentry/nextjs';

type LogContext = Record<string, unknown>;

const isDev = process.env.NODE_ENV === 'development';

function format(level: string, message: string, context?: LogContext) {
  const entry = { level, message, timestamp: new Date().toISOString(), ...context };
  return JSON.stringify(entry);
}

// Supabase returns plain error objects with no stack. Wrap them in an Error created
// here so Sentry gets a stack trace pointing at the failing call site; a real thrown
// Error passed as `context.error` is reported as-is to keep its original stack.
function toError(message: string, context?: LogContext): Error {
  const original = context?.error;
  if (original instanceof Error) return original;
  const err = new Error(message, { cause: original });
  Error.captureStackTrace?.(err, logger.error);
  return err;
}

// Rejections users trigger on purpose (our RAISE EXCEPTION rules, duplicates, CHECK limits).
// They're shown in the UI already; keep them as breadcrumbs instead of Sentry issues.
const EXPECTED_CODES = new Set(['P0001', '23505', '23514']);

function sentryTags(context?: LogContext) {
  const code = context?.code;
  return typeof code === 'string' || typeof code === 'number' ? { 'error.code': String(code) } : undefined;
}

export const logger = {
  error(message: string, context?: LogContext) {
    if (isDev) console.error(format('error', message, context));
    if (EXPECTED_CODES.has(String(context?.code))) {
      Sentry.addBreadcrumb({ level: 'warning', message, data: context });
      return;
    }
    Sentry.captureException(toError(message, context), {
      level: 'error',
      tags: sentryTags(context),
      extra: { logMessage: message, ...context },
    });
  },
  warn(message: string, context?: LogContext) {
    if (isDev) console.warn(format('warn', message, context));
    Sentry.captureMessage(message, {
      level: 'warning',
      tags: sentryTags(context),
      extra: context,
    });
  },
  info(message: string, context?: LogContext) {
    if (isDev) console.info(format('info', message, context));
    Sentry.addBreadcrumb({ level: 'info', message, data: context });
  },
};
