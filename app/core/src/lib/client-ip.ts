/**
 * The Edge client-IP trust boundary.
 *
 * ONE authority, not a deny list. Every proxy/client-identity header that
 * arrives from outside is attacker-controlled: the browser chose to send it, or
 * some intermediary did. The previous spelling deleted a list of names
 * (`Forwarded`, `X-Forwarded-*`, `X-Real-IP`) and relayed everything else, which
 * makes correctness a race between this file and whatever alias a future Rails
 * middleware decides to honour — `True-Client-IP` and `Client-IP` were already
 * outside it.
 *
 * So the contract is inverted here. Cloudflare's `CF-Connecting-IP` is the only
 * source of client identity Edge will read, it is validated as exactly one IPv4
 * or IPv6 literal, and the canonical `X-Forwarded-For` Rails receives is
 * REGENERATED from that value — never appended to, never passed through.
 *
 * When there is no validated address, Edge asserts none: every identity header
 * is removed and no `X-Forwarded-For` is written. There is deliberately no
 * fallback to another header, to the peer address, or to a placeholder — a
 * fabricated client IP is worse than an absent one, because Rails cannot tell
 * the two apart. `docs/development/edge-client-ip-contract.md` is normative.
 */

/** The one header Edge reads a client IP from. Set by Cloudflare, not the caller. */
export const CLIENT_IP_AUTHORITY_HEADER = 'cf-connecting-ip';

/** The header Rails is given, always with exactly one validated address. */
export const CANONICAL_CLIENT_IP_HEADER = 'x-forwarded-for';

/**
 * Every client-identity header removed before the request crosses into Rails,
 * including `CF-Connecting-IP` itself: it is Edge's input, not Rails'. Anything
 * Rails is meant to believe is written by `canonicalizeClientIdentity` below.
 *
 * Names are lower case because `Headers` keys are.
 */
export const UNTRUSTED_CLIENT_IP_HEADERS: readonly string[] = [
  'cf-connecting-ip',
  'cf-connecting-ipv6',
  'cf-pseudo-ipv4',
  'client-ip',
  'forwarded',
  'true-client-ip',
  'x-client-ip',
  'x-cluster-client-ip',
  'x-forwarded-for',
  'x-real-ip',
];

function isIpv4(value: string): boolean {
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (part.length === 0 || part.length > 3) return false;
    if (!/^\d+$/u.test(part)) return false;
    // `010` and `0203.0.113.10` are the same address to some parsers and a
    // different one to others; an ambiguous literal is not a validated literal.
    if (part.length > 1 && part.startsWith('0')) return false;
    if (Number(part) > 255) return false;
  }
  return true;
}

function isIpv6(value: string): boolean {
  if (!value.includes(':')) return false;
  const halves = value.split('::');
  if (halves.length > 2) return false;

  const compressed = halves.length === 2;
  const head = halves[0] ?? '';
  const tail = compressed ? (halves[1] ?? '') : '';

  const groups: string[] = [];

  const collect = (section: string, isTail: boolean): boolean => {
    if (section.length === 0) return true;
    const pieces = section.split(':');
    for (const [index, piece] of pieces.entries()) {
      if (piece.length === 0) return false;
      if (piece.includes('.')) {
        // A trailing dotted quad is legal, and only there. It occupies two groups.
        const last = index === pieces.length - 1;
        if (!last || (!isTail && compressed) || !isIpv4(piece)) return false;
        groups.push('0', '0');
        continue;
      }
      if (piece.length > 4 || !/^[0-9a-f]+$/iu.test(piece)) return false;
      groups.push(piece);
    }
    return true;
  };

  if (!collect(head, false)) return false;
  if (!collect(tail, true)) return false;

  return compressed ? groups.length <= 7 : groups.length === 8;
}

/**
 * The validated client IP carried by `value`, or null.
 *
 * Exactly one address. A comma-separated list, a host:port pair, a bracketed
 * literal, a zone id, a hostname, an empty string, a NUL and anything carrying a
 * control character are all rejected rather than trimmed into shape — the point
 * of the contract is that Rails receives a value Edge could fully account for.
 */
export function parseClientIp(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (candidate.length === 0) return null;
  for (let i = 0; i < candidate.length; i += 1) {
    const code = candidate.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return null;
  }
  if (candidate.includes(',')) return null;
  return isIpv4(candidate) || isIpv6(candidate) ? candidate : null;
}

/** The validated client IP for `request`, read only from the authority header. */
export function readClientIp(request: Request): string | null {
  return parseClientIp(request.headers.get(CLIENT_IP_AUTHORITY_HEADER));
}

/**
 * Rewrites `headers` so the only client identity Rails can observe is `clientIp`.
 *
 * Mutates in place — the caller owns the `Headers` copy. `X-Forwarded-Host` and
 * `X-Forwarded-Proto` are dropped by the caller's `x-forwarded-` sweep; they are
 * not client identity, but they are equally caller-controlled.
 */
export function canonicalizeClientIdentity(headers: Headers, clientIp: string | null): void {
  for (const name of UNTRUSTED_CLIENT_IP_HEADERS) {
    headers.delete(name);
  }
  if (clientIp !== null) {
    headers.set(CANONICAL_CLIENT_IP_HEADER, clientIp);
  }
}
