import { describe, expect, it, vi } from 'vitest';

import {
  EDGE_RESPONSE_TIMEOUT_MS,
  responseGenerationTimeoutResponse,
  withResponseGenerationTimeout,
} from '../../src/lib/response-timeout';

describe('response generation timeout', () => {
  it('clears its timer when the operation completes', async () => {
    vi.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const onTimeout = vi.fn(responseGenerationTimeoutResponse);
      const response = await withResponseGenerationTimeout((operationSignal) => {
        signal = operationSignal;
        return new Response('ok');
      }, onTimeout);

      await vi.advanceTimersByTimeAsync(EDGE_RESPONSE_TIMEOUT_MS);
      expect(response.status).toBe(200);
      expect(signal?.aborted).toBe(false);
      expect(onTimeout).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('aborts the operation signal and returns the fixed timeout response', async () => {
    vi.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      const responsePromise = withResponseGenerationTimeout((operationSignal) => {
        signal = operationSignal;
        return new Promise<Response>(() => {});
      }, responseGenerationTimeoutResponse);

      await vi.advanceTimersByTimeAsync(EDGE_RESPONSE_TIMEOUT_MS);
      const response = await responsePromise;

      expect(signal?.aborted).toBe(true);
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
    } finally {
      vi.useRealTimers();
    }
  });

  it('observes a late operation rejection after the timeout response', async () => {
    vi.useFakeTimers();
    try {
      let rejectOperation: ((reason?: unknown) => void) | undefined;
      const responsePromise = withResponseGenerationTimeout(
        () =>
          new Promise<Response>((_resolve, reject) => {
            rejectOperation = reject;
          }),
        responseGenerationTimeoutResponse,
      );

      await vi.advanceTimersByTimeAsync(EDGE_RESPONSE_TIMEOUT_MS);
      await expect(responsePromise).resolves.toMatchObject({ status: 503 });
      rejectOperation?.(new Error('late operation failure'));
      await Promise.resolve();
    } finally {
      vi.useRealTimers();
    }
  });
});

it('surfaces an exception thrown by the timeout handler', async () => {
  vi.useFakeTimers();
  try {
    const responsePromise = withResponseGenerationTimeout(
      () => new Promise<Response>(() => {}),
      () => {
        throw new Error('timeout handler failed');
      },
    );
    const assertion = expect(responsePromise).rejects.toThrow('timeout handler failed');
    await vi.advanceTimersByTimeAsync(EDGE_RESPONSE_TIMEOUT_MS);
    await assertion;
  } finally {
    vi.useRealTimers();
  }
});

it('ignores a late operation success after the timeout response has won', async () => {
  vi.useFakeTimers();
  try {
    let resolveOperation: ((value: Response) => void) | undefined;
    const responsePromise = withResponseGenerationTimeout(
      () =>
        new Promise<Response>((resolve) => {
          resolveOperation = resolve;
        }),
      responseGenerationTimeoutResponse,
    );

    await vi.advanceTimersByTimeAsync(EDGE_RESPONSE_TIMEOUT_MS);
    await expect(responsePromise).resolves.toMatchObject({ status: 503 });
    resolveOperation?.(new Response('late success'));
    await Promise.resolve();
  } finally {
    vi.useRealTimers();
  }
});
