# Unit test coverage measurement

Date: 2026-09-18

Measured at commit `7436620b` with a clean working tree. Each of the twenty
deployment units ran its own Vitest coverage from its own directory, adding a
`json-summary` reporter written outside the repository:

```text
pnpm exec vitest run --coverage --coverage.reporter=json-summary \
  --coverage.reportsDirectory=<scratch>/<unit>
```

The per-unit `total` counts were then summed. There is no root coverage
configuration, so this sum is the repository-wide value. Files excluded by
each unit's `vitest.config.ts` (for example `routeTree.gen.ts`) are not
counted.

All twenty units (`{app,com,org}/{apex,core,docs,help,info,news}`, `dev/apex`,
`net/apex`) reported 100% on every metric.

| Metric     | Covered / total | Percent |
| ---------- | --------------- | ------- |
| Statements | 14677 / 14677   | 100.00% |
| Branches   | 10783 / 10783   | 100.00% |
| Functions  | 3972 / 3972     | 100.00% |
| Lines      | 13506 / 13506   | 100.00% |

Cross-check: `pnpm run test:cov` in `org/news` with the unit's own reporters
printed Statements 930/930, Branches 676/676, Functions 250/250 and
Lines 851/851. All four are 100% and match the summed data.
