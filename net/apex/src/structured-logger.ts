import { structuredLogger } from '@hono/structured-logger';
import type { Context } from 'hono';

import type { ApexEnv } from './create-apex-app';
import type { AssetEnv } from './security-headers';

export type LogOutcome = 'started' | 'completed' | 'failed' | 'degraded' | 'trace';
export type LogMessage = 'request start' | 'request end' | 'request error';
export type LogData = {
  outcome: LogOutcome;
  status?: number;
  duration_ms?: number;
};

// This is the only logger surface available to an apex route. Keeping the
// fields closed makes it impossible for a route to add a path, query, header,
// body, or exception message to the emitted record.
export type BaseLogger = {
  info(data: LogData, msg?: LogMessage): void;
  warn(data: LogData, msg?: LogMessage): void;
  error(data: LogData, msg?: LogMessage): void;
  debug(data: LogData, msg?: LogMessage): void;
};

type LogMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'OTHER';
type LogRoute =
  | 'root'
  | 'about'
  | 'health'
  | 'health-startup'
  | 'health-liveness'
  | 'health-readiness'
  | 'health-api'
  | 'revision'
  | 'revision-api'
  | 'other';
type LogEnvironment = 'production' | 'development' | 'test' | 'local' | 'vpc' | 'unknown';

function normalizeMethod(method: string): LogMethod {
  switch (method) {
    case 'GET':
    case 'HEAD':
    case 'POST':
    case 'PUT':
    case 'PATCH':
    case 'DELETE':
    case 'OPTIONS':
      return method;
    default:
      return 'OTHER';
  }
}

function normalizeEnvironment(environment: string | undefined): LogEnvironment {
  if (environment === undefined) return 'unknown';
  switch (environment) {
    case 'production':
    case 'development':
    case 'test':
    case 'local':
    case 'vpc':
      return environment;
    default:
      return 'unknown';
  }
}

function routeId(path: string): LogRoute {
  switch (path) {
    case '/':
      return 'root';
    case '/about':
      return 'about';
    case '/health':
      return 'health';
    case '/health/startups':
      return 'health-startup';
    case '/health/livenesses':
      return 'health-liveness';
    case '/health/readinesses':
      return 'health-readiness';
    case '/api/v0/health.json':
      return 'health-api';
    case '/revision':
      return 'revision';
    case '/api/v0/revision.json':
      return 'revision-api';
    default:
      return 'other';
  }
}

function eventData(data: LogData): Record<string, LogOutcome | number> {
  const safeData: Record<string, LogOutcome | number> = { outcome: data.outcome };
  if (data.status !== undefined) safeData['status'] = data.status;
  if (data.duration_ms !== undefined) safeData['duration_ms'] = data.duration_ms;
  return safeData;
}

function emit(
  level: 'info' | 'warn' | 'error' | 'debug',
  data: Record<string, unknown>,
  msg?: LogMessage,
) {
  const line = JSON.stringify(msg === undefined ? { level, data } : { level, msg, data });
  if (level === 'error') {
    // oxlint-disable-next-line no-console
    console.error(line);
  } else if (level === 'warn') {
    // oxlint-disable-next-line no-console
    console.warn(line);
  } else {
    // oxlint-disable-next-line no-console
    console.log(line);
  }
}

function createRequestLogger(c: Context<ApexEnv>): BaseLogger {
  const edgeEnv = (c.env as AssetEnv | undefined)?.EDGE_ENV;
  const base = {
    service: 'apex',
    environment: normalizeEnvironment(edgeEnv),
    request_id: c.get('requestId'),
    method: normalizeMethod(c.req.method),
    route: routeId(c.req.path),
  };

  return {
    info: (data, msg) => emit('info', { ...base, ...eventData(data) }, msg),
    warn: (data, msg) => emit('warn', { ...base, ...eventData(data) }, msg),
    error: (data, msg) => emit('error', { ...base, ...eventData(data) }, msg),
    debug: (data, msg) => emit('debug', { ...base, ...eventData(data) }, msg),
  };
}

export const apexStructuredLogger = structuredLogger<ApexEnv, BaseLogger>({
  createLogger: createRequestLogger,
  onRequest: (logger) => logger.info({ outcome: 'started' }, 'request start'),
  onResponse: (logger, c, elapsedMs) =>
    logger.info(
      { outcome: 'completed', status: c.res.status, duration_ms: Math.round(elapsedMs) },
      'request end',
    ),
  onError: (logger, _error, c, elapsedMs) =>
    logger.error(
      { outcome: 'failed', status: c.res.status, duration_ms: Math.round(elapsedMs) },
      'request error',
    ),
});
