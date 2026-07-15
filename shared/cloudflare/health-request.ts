function isAscii(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) > 0x7f) {
      return false;
    }
  }

  return true;
}

function buildAsciiHeaders(source: Headers): Headers {
  const headers = new Headers();

  source.forEach((value, name) => {
    if (isAscii(value)) {
      headers.set(name, value);
    }
  });

  return headers;
}

/**
 * Build the request used by the health endpoint without non-ASCII headers.
 * Health does not need client location metadata, and Fetch header values must
 * be ASCII-compatible at the boundary where the Worker invokes OpenNext.
 */
export function sanitizeHealthRequest(request: Request): Request {
  return new Request(request.url, {
    method: request.method,
    headers: buildAsciiHeaders(request.headers),
  });
}
