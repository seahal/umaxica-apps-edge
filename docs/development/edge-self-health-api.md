# Edge self-health API

Machine-facing JSON for **this Edge runtime only**.

```text
GET /api/v0/health.json
```

- JSON, not HTML, not `text/plain`
- framework-independent DTO
- Edge-self-only: no Rails, no Workers VPC, no CMS, no revision
- `Cache-Control: no-store`
- `X-Robots-Tag: noindex, nofollow`
- no language cookie, no CSRF, no authentication, no redirect

The same DTO shape is implemented independently by Rails (ADR 016). Rails'
document reports Rails. This document reports the Edge Worker that served it.

Operational Kubernetes-style probes remain:

```text
GET /health
GET /health/startups
GET /health/livenesses
GET /health/readinesses
```

Those stay `text/plain`. Do not treat them as this API. Do not treat
`/health.json` (origin root) as this API. Deployment identity is
`GET /revision` and `GET /api/v0/revision.json` — see
[edge-revision-api.md](./edge-revision-api.md).

## Body

```json
{
  "status": "pass",
  "checks": {
    "startup": { "status": "pass" },
    "liveness": { "status": "pass" },
    "readiness": { "status": "pass" }
  }
}
```

`status` ∈ `{pass, warn, fail}`. The current isolate has no extra dependency,
so a successful execution returns `pass` throughout.

## Units

| Runtime        | Units                                 | Mechanism                                                  |
| -------------- | ------------------------------------- | ---------------------------------------------------------- |
| Hono           | `{app,com,org,net,dev}/apex`          | `create-apex-app.ts`                                       |
| TanStack Start | `{app,com,org}/core`                  | Server Route `src/routes/api.v0.health[.]json.ts`          |
| Astro          | `{app,com,org}/{docs,help,info,news}` | `src/pages/api/v0/health.json.ts` with `prerender = false` |

No Next.js unit remains active.

HTTP contract: `api/health-api.hurl` in each unit (`pnpm --dir <unit> run test:api`).
