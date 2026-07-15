/* eslint-disable import/no-named-export, import/no-relative-parent-imports */
import app from '../../src/index';

export const requestFromOrgApp = (
  path: string,
  init?: RequestInit,
  env?: Record<string, unknown>,
): Response | Promise<Response> => app.request(path, init, env);
