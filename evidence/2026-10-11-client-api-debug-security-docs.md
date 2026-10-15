# Client API and debug security documentation checks

- Scope: added development guidance on browser-reachable internal APIs and exclusion of debug code from production artifacts; linked it from the static-analysis guide. No application code changed.
- `pnpm install`: completed successfully with pnpm 12.0.0. Reported Node 24.21.0 against the requested 24.20.0.
- Oxfmt check on both changed documentation files: passed.
- CSpell check on both changed documentation files: passed, zero issues.
- `git diff --check`: passed.
- `pnpm run check`: did not complete. The invocation produced no output, including in `/tmp/edge-docs-check.log`, and was interrupted with exit code 130. A second invocation and `pnpm --version` also produced no output and were interrupted. The cause was not established; no full static-check or unit-test success is claimed.
- No browser build, HTTP test, deployment, or security audit was performed for this documentation-only change.
- Existing changes to `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` were present before this work.
