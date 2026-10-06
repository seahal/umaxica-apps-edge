# TanStack Start bundle budget decision

Date: 2026-09-17

The continuation review explicitly approved a 150 kB gzip ceiling for the
fifteen TanStack Start units. The five Hono Apex units keep their existing
52 kB ceiling. This decision changes only the fifteen per-unit
`.size-limit.json` files; it does not change application code, the build, or
the Apex configuration.

Before the decision, the measured client output was 121.67–121.71 kB for the
public cells against 112 kB, and 129.82–132.97 kB for Core against 129 kB.
The public locale catalog cleanup in `b15f0ae8` had already reduced public
output by about 1 kB from the immediately preceding 122.65–122.69 kB result.

After changing the fifteen TanStack limits, this command passed for all twenty
units:

```text
pnpm -r --no-bail --workspace-concurrency=1 run check:size
```

Observed gzip measurements were:

- TanStack public: 121.67–121.71 kB / 150 kB;
- TanStack Core: 129.83–132.97 kB / 150 kB; and
- Hono Apex: 48.82–48.93 kB / 52 kB.

The explicit staged-path review and `git diff --cached --check` passed. The
pre-commit format and spelling hooks passed for all fifteen configuration
files. The configuration change was committed locally as `f4d94584`
(`chore: set TanStack bundle budget`). No Apex `.size-limit.json`, Rails code,
Cloudflare configuration, deployment or remote GitHub state was changed.
