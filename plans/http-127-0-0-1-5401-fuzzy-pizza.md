# Fix: `wrangler dev` unreachable at http://127.0.0.1:5401 from inside dev container

## Context

The user is working inside a dev container and cannot reach `http://127.0.0.1:5401/`
(the `app/apex` Hono worker) even though the port should be forwarded to the host.
Cause: `wrangler dev` defaults to binding on `127.0.0.1` inside the container, which
is only reachable from _within_ that container's own network namespace — not from
the host, even with the port forwarded. None of the `*/apex` `dev` scripts pass an
`--ip` flag, so this affects all four apex workers (`app/apex`, `com/apex`,
`net/apex`, `org/apex`), not just `app/apex`.

This is unrelated to the currently uncommitted `wrangler.jsonc` changes (those just
bump `head_sampling_rate` from `0.2` to `1` for observability, in all four files).

## Fix

Add `--ip 0.0.0.0` to the `dev` and `preview` scripts in each apex workspace's
`package.json` so wrangler's local dev server listens on all interfaces and is
reachable via the forwarded port from the host.

Files to edit (same one-line change pattern in each):

- `app/apex/package.json`
- `com/apex/package.json`
- `net/apex/package.json`
- `org/apex/package.json`

For each, change:

```
"dev": "wrangler dev --config wrangler.jsonc --port <PORT>",
"preview": "pnpm run build && wrangler dev --config wrangler.jsonc --local",
```

to:

```
"dev": "wrangler dev --config wrangler.jsonc --port <PORT> --ip 0.0.0.0",
"preview": "pnpm run build && wrangler dev --config wrangler.jsonc --local --ip 0.0.0.0",
```

(ports: app=5401, com=5101, net=5201, org=5301 — unchanged, only adding `--ip`)

## Verification

- Run `pnpm --filter umaxica-apps-edge-apex-app run dev`
- From the host (outside the container), curl or open `http://127.0.0.1:5401/health`
  (or whatever the container's port-forwarding maps to) and confirm a response.
- Optionally repeat for one other apex workspace (e.g. `com/apex`) to confirm the
  pattern works consistently.
