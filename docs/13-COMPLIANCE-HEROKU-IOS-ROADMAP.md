# Linora Compliance — Heroku deployment and executive UX

Status: **PR / NOT DEPLOYED**. This change adds a Heroku-ready entry point and improves the existing authenticated compliance dashboard; it does not provision a Heroku application or configure DNS.

## What exists and what is repaired

- Compliance is already implemented inside `apps/web` at `/compliance` and `/compliance/[assessmentId]`, with Next.js API routes for assessments, item edits, CAP drafting, evidence binders and auto-assessment. This is **not** an independently deployed compliance service.
- The main application uses Next.js 16, npm workspaces, and Supabase Auth/Postgres. Heroku should run the **same application**, rather than a duplicate unauthenticated compliance database or an empty landing page.
- This PR adds a root `Procfile`, an explicit `heroku-postbuild` script, a liveness endpoint at `/api/health`, and a host-scoped redirect from `/` to `/compliance` when `COMPLIANCE_HOSTNAME` is configured. Login, registration and the rest of the authenticated application remain reachable on that host.
- The dashboard now includes an executive overview and counts derived from tenant-scoped assessments. Counts represent assessment-item statuses, **not certified compliance**.

## Deploy on Heroku (operator action required)

1. Create a new Heroku Node.js app connected to this repository. Use the repository root as the build context, not `apps/web` alone; `packages/shared` is a workspace dependency.
2. Use the Heroku Node.js buildpack, Node 22 or newer, and the root `Procfile`. The root `heroku-postbuild` executes the Next.js build. Set the web dyno size according to observed memory and CPU; the ephemeral filesystem is not document storage.
3. Set environment variables via Heroku Config Vars (never commit secrets): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or the public publishable-key variable expected by the app), `SUPABASE_SECRET_KEY` for server-only privileged routes, `GROQ_API_KEY` if enabling AI features, and all other variables required by `apps/web` at build and runtime. **Review exact variable names in the app before provisioning.** Some `NEXT_PUBLIC_*` values must be present at build time.
4. Configure `COMPLIANCE_HOSTNAME` to the intended domain, e.g. `compliance.example.com` (hostname only, no scheme/path). Add that custom domain to Heroku, point the DNS CNAME at the **Heroku-provided DNS target**, and enable Heroku Automated Certificate Management. Do not invent or hard-code a DNS target.
5. Add the new origin and callback URLs to the Supabase Auth redirect allowlist. Verify login, logout, password reset and authenticated session cookies on the subdomain. Treat auth origins and cookie scopes carefully; do not assume existing sessions are shared across domains.
6. Verify `https://<heroku-app>.herokuapp.com/api/health` returns HTTP 200, `/` redirects to `/compliance` on the configured hostname, `/compliance` redirects unauthenticated users to `/login`, and authenticated users see **only their own tenant's** assessments.
7. Run smoke tests for creating an assessment, editing a requirement, adding a CAP, downloading a binder and using auto-assess with a synthetic tenant. Inspect Heroku logs, startup health and Groq quotas. Do not onboard confidential factory data before cross-tenant JWT and Supabase RLS tests pass.

### Limitations and security gate

- Heroku hosting alone does not make the application operational; provisioning, DNS, secrets, database migrations, auth callbacks, testing and billing are still needed.
- Existing compliance API routes use a server-side Supabase privileged client and must be audited for tenant scoping and authorization. The existing auto-assess path is synchronous streaming and may exceed request timeouts for large checklists; move long jobs to a queue before enterprise workloads.
- Do not advertise automatic audit certification or guaranteed compliance. Human approval and source verification remain required.
- Supabase is shared with unrelated apps. No live database or function-grant changes are included.

## iOS product path (proposed)

**Phase A — Executive responsive web:** Validate the dashboard on iPhone Safari, including login, CAP review, citations and export. Prioritize fast read-only executive views and accessible 44px touch targets.

**Phase B — iOS app:** Use Expo/React Native (shared TypeScript contracts and API, not shared Next.js pages). Implement Supabase Auth with deep-link callback, secure token storage, tenant-aware permissions, document previews and notifications. Never ship privileged Supabase keys to the device.

**Phase C — App Store:** Establish Apple Developer Program membership, privacy disclosures, account deletion where applicable, production data-retention policy, app review access and a tested TestFlight build. Verify Apple's latest enterprise/B2B distribution and purchase rules before choosing public App Store versus Apple Business Manager Custom Apps. The iOS app should serve C-suite decision-makers, while compliance operators may continue using web.

### Suggested visual language

Executive assurance cockpit: dark graphite/teal palette, large evidence-status metrics, audit trail timeline, document provenance, factory selector, concise exception cards and a dedicated mobile executive brief. Avoid using color alone to communicate compliance state.
