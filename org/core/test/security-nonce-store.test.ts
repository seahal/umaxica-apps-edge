import { describe, expect, it } from 'vitest';

import { getRequestId, installRequestIdStore, runWithRequestId } from '../src/security-nonce';

describe('request id store install', () => {
  it('replaces the process-wide store used by runWithRequestId', () => {
    const seen: string[] = [];
    installRequestIdStore({
      run: (requestId, fn) => {
        seen.push(requestId);
        return fn();
      },
      getStore: () => seen.at(-1),
    });

    expect(runWithRequestId('req-from-edge', () => getRequestId())).toBe('req-from-edge');
    expect(seen).toEqual(['req-from-edge']);
  });
});
