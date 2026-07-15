// @ts-expect-error OpenNext creates this module during the build step.
import nextWorker from '../.open-next/worker.js';
import { sanitizeHealthRequest } from '../../../shared/cloudflare/health-request';

export default {
  fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
    const pathname = new URL(request.url).pathname;
    const sanitizedRequest = pathname === '/health' ? sanitizeHealthRequest(request) : request;

    return nextWorker.fetch(sanitizedRequest, env, ctx);
  },
};
