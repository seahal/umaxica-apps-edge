# Edge connectivity acceptance

> **2026-10-01 — app/com/org apex retired.** `app/apex`, `com/apex` and `org/apex` are no longer
> deployment units ([ADR 024](../../adr/024-retire-app-com-org-apex-units.md)). Rows and run logs
> below that mention them, or `umaxica.{app,com,org}` → `core:5401/5101/5301`, are historical
> measurements. Edge no longer owns those apex hostnames; the remaining Edge apexes are `net/apex`
> and `dev/apex`.

The active acceptance matrix and commands are maintained in
[`docs/development/cloudflare-development-network.md`](../development/cloudflare-development-network.md).

Use the targeted checks rather than treating one `/health` response as stack-wide proof:

```bash
scripts/check-local
scripts/check-rails
scripts/check-cloudflare
scripts/check-tunnel
scripts/check-vpc
scripts/check-apex-domains
scripts/check-www-canonical
```

## `www` canonicalisation

`scripts/check-www-canonical` asserts that `www.umaxica.net` and
`www.umaxica.dev` answer `301` to their apex with the path and query string
intact. That redirect is a Cloudflare Redirect Rule rather than application
code, so this script is the only place it is verified —
[`net-www-canonicalisation.md`](net-www-canonicalisation.md) records the rule
itself and the order it has to be created in.

## Apex domain binding

`scripts/check-apex-domains` verifies that each Edge-owned production apex hostname is
served by its own Worker (only `umaxica.net` since ADR 024; `umaxica.dev` is listed for reference), by reading the `service` field of `/health.json`:

| Hostname      | Expected Worker              | `service` |
| ------------- | ---------------------------- | --------- |
| `umaxica.net` | `umaxica-apps-edge-net-apex` | `net`     |
| `umaxica.dev` | `umaxica-apps-edge-dev-apex` | `dev`     |

## Development Tunnel acceptance — 2026-09-01 (historical; predates ADR 024)

All five apex Hono development servers are reachable through the Edge-owned Cloudflare Tunnel. The remotely managed Public Hostnames terminate on the Compose service name `core`, one port per unit:

| Hostname      | Tunnel origin      | Authenticated `/health.json` |
| ------------- | ------------------ | ---------------------------- |
| `umaxica.app` | `http://core:5401` | `200`, `service=app`         |
| `umaxica.com` | `http://core:5101` | `200`, `service=com`         |
| `umaxica.net` | `http://core:5201` | `200`, `service=net`         |
| `umaxica.org` | `http://core:5301` | `200`, `service=org`         |
| `umaxica.dev` | `http://core:5501` | `200`, `service=dev`         |

The result was measured end to end from an operator browser after Cloudflare Access authentication. Each local Hono structured log recorded the request and a `200` response from the matching service, which rules out both a pre-origin response and a transposed port. Root-route behaviour was also observed: `app`, `com`, and `org` returned their intended `301`; `net` and `dev` returned `200`.

A separate unauthenticated pass over `/`, `/health.json`, and `/.env` returned a `302` to the Cloudflare Access team domain for all five hostnames. `umaxica.dev` was briefly reachable without Access while its policy update propagated; automated probes reached its Hono 404 handler for `.env` variants, but every probe returned `404` and no environment content was served. After propagation, `https://umaxica.dev/.env` returned the same pre-origin Access `302` as the other apexes.

This acceptance proves the development ingress graph `browser → Access → Tunnel → core:<port> → Hono`. It does not prove a deployed Worker binding or the separate Workers VPC → Rails path.

A reachability check is not enough here. A hostname bound to the wrong Worker
still answers `200` on every route — it just serves another domain's content
and, on `/`, another domain's redirect target. This check is what distinguishes
the two.

**The apex hostnames are now owned by the development Cloudflare Tunnel**, so this
check no longer measures a Worker binding — it measures whatever currently owns
the hostname. Under the Tunnel that is the local `*/apex` dev server, and the
`service` field still identifies it. What changed is the subject, not the method.

**Since 2026-08-11 this script does not work unauthenticated.** Cloudflare Access
covers all five apex hostnames with no `/health*` Bypass, so `/health.json`
answers a 302 to the team domain. `curl --fail` trips, `service` is never read,
and every host prints `<unreachable>`. The five `FAIL` lines mean "Access is in
front", not "the binding is wrong" — see
`adr/008-edge-development-tunnel-exposure.md` for why the Bypass was declined.

The script is a manual diagnostic; it is not wired into CI, lefthook, or any
`package.json` script, so nothing automated depends on it. To restore it, send an
Access service token rather than reopening `/health*`. `scripts/check-tunnel`
already carries the safe pattern: `curl --config -` with the headers fed over
stdin so they never appear in the process argv. That change is a deliberate
follow-on and has not been made.

Each `*/apex/wrangler.jsonc` therefore declares `"routes": []` at the top level.
It used to declare `custom_domain: true` so `wrangler deploy` would reconcile the
binding, but a custom domain and a Tunnel Public Hostname cannot both own one
name, so that reconciliation would now reclaim the hostname from the Tunnel on
every production deploy. Restoring an apex domain to its Worker means removing
the Public Hostname entry first, then putting the `routes` entry back — in that
order. See `adr/008-edge-development-tunnel-exposure.md` and
[`cloudflare-tunnel-development.md`](cloudflare-tunnel-development.md).

Known failure at the time of writing: `umaxica.net` answers `service: "app"` in
production — the `app/apex` Worker, not `net/apex`. This is the incident ADR 003
records, still live. The Tunnel cutover masks the symptom without fixing the
binding: measured through the Tunnel on 2026-08-11, while the hostnames were
still unauthenticated, `umaxica.net` answered `service=net` correctly, as did the
other three.

Note that the unauthenticated check no longer distinguishes that case. With Access in front it fails on **all five** hostnames with `<unreachable>`, so a genuine misbinding and a healthy surface produce the same output. The last unauthenticated machine-made reading of the original four `service` values is the 2026-08-11 one recorded in [`cloudflare-tunnel-development.md`](cloudflare-tunnel-development.md). The authenticated 2026-09-01 browser and structured-log reading of all five values is recorded above.
