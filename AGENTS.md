# AGENTS.md — Linora MIOS development contract

Before editing the Linora product architecture, read [PLAN.md](PLAN.md). The plan is binding for route ownership, product copy boundaries, deployment gates and architectural intent.

## Non-negotiable engineering practices
- Preserve the existing monorepo layout (`apps/web` Next.js, `apps/api` FastAPI, `packages/shared`).
- Implement public subdomain sites as marketing views of the **same** brand and canonical app, not new unaudited auth stacks or customer-data replicas. Authenticated factory work stays on one canonical origin until explicitly migrated.
- User-supplied `Host`, query strings, display names and `user_metadata` are never trusted for authorization or external redirects. Product domain mapping must be exact, restricted, testable, and cannot become an alternate API hostname.
- Never expose `SUPABASE_SECRET_KEY`, service role, signing keys, database password or bearer JWT in `NEXT_PUBLIC_*`, client bundles, logs, tickets, documentation or commits. Use per-user JWT + verified `app_metadata` and tenant RLS for normal operations.
- No claim of audit certification or automatic positive compliance verdict. AI is evidence assistance; verified compliance requires independent human review.
- **Shared Supabase project:** do not execute schema or grant changes without a staging rehearsal, cross-tenant JWT tests, owner review, backup/rollback analysis and explicit deployment approval.
- Do not merge PRs #34 and #35 indiscriminately; both touch the compliance redesign. #37 is separate and gated.
- Do not invent domains, DNS verification, operating metrics, completed features, billing capabilities or deployment success.

## Product subdomains and code ownership
- `apps/web/lib/products/catalog.ts`: centralized approved product messaging, routes, status and navigation metadata.
- `apps/web/lib/products/subdomains.ts`: pure exact-hostname matching, safe product route rewrite decision, canonical app URLs.
- `apps/web/proxy.ts`: add only public product-host routing before existing Supabase proxy; leave canonical auth behavior intact.
- `apps/web/app/(marketing)/products/**`: brand landing and informational pages, independent of customer database queries.
- `apps/web/app/(marketing)/layout.tsx`: public brand navigation; no privileged Auth/DB calls.
- `apps/web/tests/product-subdomains.test.ts`: host spoofing, public path, private path, and route registry regressions.

## Definition of done
1. Tests + lint + typecheck/build pass in GitHub Actions on the actual final commit.
2. Deployed Vercel preview is READY, then manual browser verification (mobile + desktop).
3. Production deploy requires domain ownership and DNS/SSL, security signoff for authenticated surfaces and a rollback plan.
4. Update `PLAN.md` checklist and link PR/CI evidence; explicitly distinguish built, tested, reviewed, configured, deployed and independently verified states.
5. Do not claim operations are live unless an external provider confirms them and an authenticated smoke test proves them.

## Development execution order
0. Maintain `PLAN.md` and these guardrails.
1. Build product catalog, host resolver and unit tests.
2. Implement static product pages and navigation; preserve existing MIOS URLs and copy.
3. Test and fix CI/build failures on a draft branch.
4. Stage proposed DNS and Vercel domain activation only after owner confirmation.
5. Integrate vetted per-product private capabilities later; never treat public routing as tenant isolation.

## Useful commands
From repository root: `npm ci`, `npm run test --workspace mios-web`, `npm run lint --workspace mios-web`, `npm run build --workspace mios-web`.
Backend checks are configured in `.github/workflows/ci.yml`. Some database integration tests skip without staging DSN: a green run **does not prove cross-tenant safety**.
