# Workers VPC → Rails: 12 public content surfaces

Date: 2026-09-19

Command: `pnpm run check:vpc` (after `wrangler whoami` confirmed an OAuth session).

Result: **PASS** for all twelve `{app,com,org}/{docs,help,info,news}` surfaces on
all three gates — Direct VPC → Rails, VPC identity (answered from the matching
surface/audience), VPC contract (`status=pass`, required fields present).

The three Cores show `—` and a "gates missing a surface" WARN; expected, since
they reach Rails over the public internet (ADR 018), not Workers VPC.
