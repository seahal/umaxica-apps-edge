# Core Edge Workers Handoff (2026-11-12)

Core Edge work (formerly planned in umaxica-apps-edge-core, now out of scope) lives in this
repository.

## Next (stage 4, together with Sphere)

Source: umaxica-apps-cosmos-sphere docs/backlog/2026-11-10-core-edge-front-and-no-rails-homepage.md.

1. Read-only first: which environment the deployed Core Workers run in, which hosts they call for
   the API, and any remaining `jp.*` names (Core moved to `www-jp.*`).
2. Declare `www-jp.umaxica.<tld>/*` routes for the Core Workers in wrangler configuration, with
   Worker-less exceptions for the Rails paths `/api/v0`, `/oidc`, `/sign` (with subpaths),
   `/.well-known/jwks.json` and `/csp-violation-report`.
3. Cloudflare routes and the tunnel path rule are external changes and the deploy is the owner's;
   ask first. Do it together with Sphere's "no Rails Core homepage" change.

## Program context (8 repositories)

The Cosmos split program covers: umaxica-apps-cosmos-{access,governance,sphere,press},
umaxica-apps-mock-oidc, umaxica-apps-edge (including the Core Edge Workers),
umaxica-apps-edge-jump and umaxica-apps-edge-away. umaxica-apps-edge-core is out of scope.

Stages (owner agreed 2026-11-12):

1. Finish cleanup: round 2 of the surface cleanup and test-baseline repair in the four Cosmos
   repositories (current stage).
2. Remove unused databases and models (owner approval right before any drop).
3. Reconnect: Access and Governance over OIDC, checked continuously with umaxica-apps-mock-oidc;
   decide first whether OIDC redirects bypass Jump (umaxica-apps-edge-jump plan of 2026-11-11).
4. Core Edge: bind the Core Workers in umaxica-apps-edge to `www-jp.*` together with "no Rails Core
   homepage" in Sphere.
5. Connect Press and Sphere to Access.
6. Away implementation; MCP in Press and Sphere (Access spec `specs/mcp-resource-servers/spec.md`).

## Standing rules for every task

- Do not commit unless the owner asks. Never print secrets or environment values.
- Never edit `config/credentials/*.yml.enc` from a Codex task: do not add, restore or change entries.
  If a test needs a missing value, report it. (On 2026-11-11 removed leaked entries reappeared in
  Access credentials; the owner wants credentials changed only by the owner or the reviewer.)
- Development data may be destroyed, but ask the owner before dropping databases or volumes and
  before any external change (Cloudflare, AWS, GitHub, providers).
- Read AGENTS.md and the rules it requires before editing. Record results in `evidence/`.
