# Linora MIOS — Implementation Agent Contract

This file governs repository-wide work. Existing narrower rules such as `apps/web/AGENTS.md` still apply; do not remove them.

## First actions

1. Read [PLAN.md](PLAN.md), the relevant existing feature code, the architecture docs and the open GitHub PRs before changing functionality.
2. Reuse existing APIs, schemas, Supabase Auth, factory `tenant_id` and design tokens instead of building duplicate capability silos.
3. For any Supabase work, check current official docs/changelog and the deployed schema; never infer access safety from an RLS flag alone.
4. Commit on a feature branch with a draft PR; do not modify live tenant data, Supabase policies, Vercel domains or production secrets as part of a UI build.
5. Run tests, lint/typecheck, Next build and secret scan; report actual outcomes, not assumptions.

## Non-negotiable security

- **Never use `user_metadata` to authorize anything.** Use verified JWT app metadata plus up-to-date server database checks for privileged writes.
- Never expose a secret/service-role credential in browser, `NEXT_PUBLIC_*`, static pages, logs, PRs or Git history. Do not copy production secrets into preview.
- Every tenant-scoped API, RLS policy, Storage path and RPC requires negative tests with two **authorized synthetic tenants**; a page rendering is not a security test.
- Do not grant new authenticated execution of privileged functions or add SECURITY DEFINER as a workaround.
- The same Supabase project hosts unrelated applications. Assess blast radius and rollback before modifying any shared table, grant, RLS policy or trigger.
- Never fabricate audit/certification outcomes; AI assistance is a suggestion pending appropriate qualified human review.

## Domain / authentication rules

- A proposed `*.linora.ai` subdomain is not live until domain ownership, DNS, TLS and the Vercel alias are independently verified.
- `LINORA_ROOT_DOMAIN` is an **explicit opt-in**. Strictly match known hostnames; never allow host suffix matching, user-selected redirects or unverified wildcard domains.
- Branded portals are public marketing/suite discovery. Authenticated customer work stays on the canonical site until reviewed cross-subdomain SSO exists.
- All public portals must be useful on the canonical host at `/portals/<slug>` even without DNS.
- Keep existing functionality and content; avoid overwriting draft PRs #34/#35/#37 or changing unrelated modules.
- Prefer accessible content, responsive layouts, explicit error/empty states and real backend data when presenting metrics.

## Delivery sequence

**Plan → Catalog → Host guard → Public portal pages → Unit tests → CI → Preview → User acceptance → DNS/SSO/security review → Production release.**

Capture any postponed feature in the plan with a concrete acceptance test and owner, not a claim that it is complete.
