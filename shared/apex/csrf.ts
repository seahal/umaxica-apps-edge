import type { MiddlewareHandler } from 'hono';
import { csrf } from 'hono/csrf';

const PRODUCTION_APEX_ORIGIN = /^https:\/\/umaxica\.(com|org|app|net)$/;
const LOCAL_APEX_ORIGIN = /^http:\/\/(com|org|app|net)\.localhost(?::\d+)?$/;
<<<<<<< HEAD
const PREVIEW_APEX_ORIGIN = /^https:\/\/.*\.workers\.dev$/;
=======
const PREVIEW_APEX_ORIGIN = /^https:\/\/[\w-]+\.[\w-]+\.workers\.dev$/;
>>>>>>> f779cd0 ([update] began to use Vite+.)

export const isAllowedApexOrigin = (origin?: string): boolean => {
  if (!origin) {
    return false;
  }

  return (
    PRODUCTION_APEX_ORIGIN.test(origin) ||
    LOCAL_APEX_ORIGIN.test(origin) ||
    PREVIEW_APEX_ORIGIN.test(origin)
  );
};

export const apexCsrf: MiddlewareHandler = async (c, next) => {
  // Call the actual CSRF middleware
  const handler = csrf({
    origin: (origin) => {
      return isAllowedApexOrigin(origin);
    },
  });

  return handler(c, next);
};
