# Linora — Multi-Subdomain Deployment & Acceptance Runbook

**Status:** Operator checklist only; no DNS/domain ownership or production release carried out by this document.  
**Owner decisions required:** the real purchased root domain, primary canonical workspace host, DNS registrar, product/legal copy, and who can change Vercel Production settings.

## 0. Before provisioning any domain

- Read [PLAN.md](../PLAN.md), [AGENTS.md](../AGENTS.md) and [16-SUBDOMAIN-DELIVERY-BLUEPRINTS.md](16-SUBDOMAIN-DELIVERY-BLUEPRINTS.md).
- Identify the Vercel project that currently hosts the production web app (MIOS) and ensure the same commit is reviewed in preview.
- Confirm root-domain legal control and DNS edit authority. `linora.ai` is **not confirmed owned**. Do not assume an advertised name is available.
- Require issue [#18](https://github.com/mnxtr/M_I_OS/issues/18) factory isolation sign-off for any authenticated production activity and issue [#36](https://github.com/mnxtr/M_I_OS/issues/36) before onboarding sensitive factory data.
- Decide whether to deploy the **portal frontend** and the **customer workspace** to the same Vercel project. The first implementation supports a single project, public-only host rewrites and **one canonical authenticated workspace**.
- Compare feature branch PR #40 with overlapping PR #39. Select one implementation and reconcile any useful differences before merging; never merge both wholesale.

## 1. Review the implementation on its current host

- Build the branch and confirm `/portals` opens the suite index on a Vercel preview or approved staging host.
- Open all ten `/portals/<slug>` routes and four sections (`platform`, `about`, `trust`, `demo`) for each. Verify metadata and copy do not promise capabilities under development.
- Confirm each "Open workspace" and "Sign in" link goes to the separately configured **canonical** `NEXT_PUBLIC_SITE_URL`. A preview hostname must not become an Auth redirect origin.
- Confirm the original `/compliance`, `/ask`, `/knowledge`, `/analytics` and other routes keep existing behavior.
- Test 375px and 1440px widths, keyboard navigation, accessible headings, link labels, reduced-motion setting and descriptive status wording.
- Run `npm ci`, `npm run test --workspace mios-web`, `npm run lint --workspace mios-web` and `npm run build --workspace mios-web`, plus existing API/secret-scan CI. Do not skip the dependency advisory review.

## 2. Allocate and verify DNS names (after ownership check)

In Vercel Settings → Domains for the approved web project, assign **explicit** hostnames—do not attach a wildcard on speculation:

| Name | Public portal destination | Initial deployment |
| --- | --- | --- |
| app.<verified-root> | Executive branded homepage | Marketing only; dashboard stays canonical |
| compliance.<verified-root> | Compliance Assurance homepage | Marketing only; compliance workspace canonical |
| ask.<verified-root> | Ask Linora homepage | Marketing only; Ask workspace canonical |
| knowledge.<verified-root> | Knowledge Hub homepage | Marketing only |
| analytics.<verified-root> | Analytics homepage | Marketing only |
| quality.<verified-root> | Quality Intelligence homepage | Marketing only; clearly mark planned |
| integrations.<verified-root> | Integrations homepage | Marketing only |
| accounts.<verified-root> | Identity & Teams homepage | Marketing only; **no new Auth endpoint** |
| billing.<verified-root> | Billing & Plans homepage | Marketing only; **no payment API** |
| governance.<verified-root> | Governance & Audit homepage | Marketing only; clearly mark planned |

- Use **the actual DNS values supplied by Vercel** after each alias is added (the target can differ by project/account). Do not invent CNAME/A values.
- Validate ownership through the DNS provider and Vercel verification. Confirm certificate issuance, HTTPS, redirect behavior and no insecure HTTP API calls.
- Record each confirmed hostname, deployment SHA, certificate state, environment, roll-back owner and evidence in the release issue. Explicitly reject any hostname that cannot be verified.

## 3. Activate the opt-in server configuration

Set the server-only `LINORA_ROOT_DOMAIN=<verified-root>` on the correct Vercel environment **only after** the domain assignments have been verified. No `NEXT_PUBLIC_` prefix is needed because the host guard is entirely server-side. Do not set the proposed `linora.ai` value simply because it appears in a plan.

Keep the existing `NEXT_PUBLIC_SITE_URL` pointing to the canonical, authenticated MIOS application. Do not alter Supabase Auth redirect allowlists to accept every portal subdomain.

Promote a reviewed release SHA and verify the environment value is active **in that new deployment**; changing an environment variable without redeploying does not retrofit an existing immutable build.

## 4. Mandatory branded-host routing checks

For each approved module hostname, test:
1. **GET /** → branded module homepage, 200.
2. **GET /platform, /about, /trust, /demo** → relevant module page, 200.
3. **GET /api/*, /login, /callback, /auth/*, /dashboard, /compliance, /guest/*, /portals/other** → **404** on the branded host. No session cookies, private responses or alternate auth.
4. **POST /, /api/*, /platform** → **404**, no side effects.
5. Unknown subdomain under the configured root → 404, not a valid customer API origin.
6. A forged/lookalike hostname (`ask.<root>.attacker.example`, `foo.ask.<root>`, missing dot, case tricks, encoded characters, malformed port) → never treated as a known module.
7. Verify product-to-product marketing navigation returns to the canonical suite index and each module's internal nav remains on its own hostname.

These routing checks are not substitutes for real factory JWT tests on the **canonical** application.

## 5. Authentication and data isolation

- Keep login, registration, OTP, password reset, onboarding and customer APIs on the canonical app while portal domains are marketing-only.
- Verify Supabase Auth URL configuration admits only the actual authorized callback origins. Review password reset, magic-link redirects and open-redirect tests.
- Before *any* future plan to put protected workspaces on `ask.`, `compliance.` or `accounts.`, design an auditable auth handoff using state/nonce, PKCE, exact redirect URI allowlists, session rotation and CSRF controls. Do not share unscoped cookies or copy browser tokens between subdomains as a shortcut.
- Continue RLS/tenant-boundary tests from issue #18 with synthetic factory A/B accounts, Data API, storage, RPCs and API routes.

## 6. Observability and rollback

- Log route status and production errors without JWTs, tokens, company-specific document content or privileged key values.
- Verify uptime checks for all confirmed public portal hosts and the canonical auth host, with owners, alert routing and a documented support response.
- Exercise rollback by reverting to previous tested Vercel deployment; when safe, remove `LINORA_ROOT_DOMAIN` and redeploy to disable dedicated-brand rewrites without changing customer data.
- Confirm all DNS records/certs remain under owner control; a rollback may require removing the alias instead of repointing to an unreviewed application.

## 7. Release sign-off record

| Gate | Evidence | Owner | Status |
| --- | --- | --- | --- |
| Branch tests/build/secret scan | CI run URL and release SHA | Engineering | Pending |
| Visual/mobile/accessibility | Screenshots and test notes | UX/product | Pending |
| Owned domain & Vercel aliases | Registrar/Vercel verification | Domain owner | Pending |
| Host negative-route checks | Verified HTTP responses | Security | Pending |
| Canonical Auth flows | Authorized real-login tests | Backend | Pending |
| Two-tenant isolation | Signed-off #18 results | Security | Pending |
| Operational monitoring and rollback | Incident rehearsal notes | Operations | Pending |
| Copy/legal/product status review | Approved marketing content | Product | Pending |

**Release decision:** No authenticated/customer-facing production migration merely because public brand pages compile. This portal rollout is intentionally reversible and keeps existing data in place.
