# Linora product-subdomain deployment and release runbook

**Release status:** Draft only. `linora.ai` and all proposed subdomains are unverified, **not configured** in Vercel as of 28 Oct 2026. Existing production site continues at `mios-manufacturing-pilot.vercel.app`. See [PLAN.md](../PLAN.md) and [AGENTS.md](../AGENTS.md).

## Deployment model and requirements

Public product sites share the existing MIOS Next.js 16 deployment; do **not** duplicate apps, databases or Auth accounts. Every branded product site is read-only marketing content. All sign-in links point to the current canonical application's `/login?next=<allowed-workspace>`; the host is never used as an authorization origin.

The supported branded product hosts are:

- `ask.linora.ai`
- `knowledge.linora.ai`
- `compliance.linora.ai`
- `analytics.linora.ai`
- `quality.linora.ai`
- `operations.linora.ai`
- `connect.linora.ai`

Each resolves these public paths: `/`, `/about`, `/platform`, `/trust`, `/demo`. Private/API/auth paths deliberately return 404 on product hosts. Unknown or reserved brand subdomains such as `api.`, `app.`, `docs.`, `status.`, `www.` also return 404 **until separately reviewed**. This protects against accidental wildcard DNS exposure.

Public pages are also independently addressable on the **existing** canonical host as `/products`, `/products/ask`, `/products/compliance/trust` etc. These are the only URLs immediately valid after an approved code release, without DNS changes.

## Before attaching domains

1. Confirm the registered owner of the target domain with the project owner. **Do not assume** `linora.ai` is available, registered or owned by Linora.
2. Confirm brand/legal name, approved contact channel, buyer claims and translations; no invented factory metrics, ISO/accreditation claims or promises of legal certification.
3. Review GitHub PR and green CI, ensure Next.js build and server-rendered marketing pages compile; confirm no duplicate routing domains in other Vercel projects.
4. Read Vercel's [custom domain setup](https://vercel.com/docs/domains/set-up-custom-domain) and [Next.js 16 Proxy docs](https://nextjs.org/docs/app/getting-started/proxy).
5. Keep any `SUPABASE_SECRET_KEY` server-only and independently reviewed; this public marketing release requires **no** privileged database changes.

## DNS and Vercel deployment

For each **owned, approved** product host:

1. Open the existing Vercel MIOS project, **Settings → Domains**. Add the exact hostname; use individual names rather than an unrestricted wildcard initially.
2. Run `vercel domains inspect <approved-host>` or use the Vercel Domains UI. Obtain the project's **actual** recommended DNS record. Do not paste a generic CNAME value blindly.
3. Create the required CNAME (or required TXT verification record) with the domain owner/registrar. Inspect verification status, certificate availability and the production deployment target. Wildcard domains require nameserver-based setup and are unnecessary for the seven initial hosts.
4. Set server-side `LINORA_PRODUCT_DOMAIN` to the verified apex on the **same Vercel project**; deploy reviewed code. No secret is needed for a marketing domain.
5. Leave `NEXT_PUBLIC_SITE_URL` pointing to the **existing canonical authenticated origin**. Do **not** switch it to `app.linora.ai` or the product host until Supabase email redirect allowlists, auth cookies, CSRF and WebAuthn/OTP journeys are reviewed and tested.
6. Verify each product host: `/` and `/about`, `/platform`, `/trust`, `/demo` return public pages; `/login`, `/callback`, `/api/...`, `/compliance`, `/guest/...` all return 404. Do not test with real factory data on untrusted hosts.
7. Test the central Vercel URL's existing sign-in, onboarding and authorized private routes to ensure no regression.

The root brand `linora.ai`, `www`, `app`, `docs`, `status` and `api` hosts are **not covered** by this public-site release. Review and implement them as separate deployment/hostname change sets.

## Repeatable public verification

After a Vercel preview has become READY, run from repo root:

```bash
node apps/web/scripts/verify-product-sites.mjs https://<verified-preview-host>.vercel.app
```

This verifies the directory, seven product hubs and four informational pages each (36 public GET pages) via the fallback path. It does **not** establish authenticated operation or custom-domain wiring.

After DNS is verified, manually verify host-level behavior (substitute an owned domain):

```bash
curl -I https://compliance.<verified-domain>/
curl -I https://compliance.<verified-domain>/platform
curl -I https://compliance.<verified-domain>/api/compliance/assessments
curl -I https://api.<verified-domain>/   # only if wildcard points at the project: expect 404
```

Do not claim any of these checks passed without captured responses. Some previews have Vercel deployment protection enabled: in that case use the approved preview-auth workflow, not a bypass.

## Reliability, accessibility and security gates

- Confirm render and navigation at 375px mobile and 1440px desktop. Verify native keyboard tab order, focus indicators, screen-reader page headings, text contrast, reduced motion, network fallback and no horizontal overflow.
- Add actual production host telemetry and route-level errors, with no factory data/credentials in URLs or frontend logs.
- Review existing HSTS `includeSubDomains; preload` against subdomain rollout readiness; an unready subdomain can be inaccessible to browsers after HSTS policy is enforced.
- Verify canonical URLs and sitemap strategy **after** the domain is owned. Avoid indexing duplicate host/path copies with inconsistent canonical tags.
- Run authenticated two-tenant security E2E and Supabase RLS tests **before enabling customer data/privileged workflows**; marketing-host routing is not an authorization layer.
- Release promotion is separate from a READY preview. Rollback: remove/disable the approved host attachment or roll back Next.js to the prior release; existing canonical app remains unaffected.

## Owner approval checklist

- [ ] Domain registration and ownership verified.
- [ ] DNS and Vercel SSL verified for each actual host.
- [ ] Approved `PLAN.md`, `AGENTS.md`, brand copy and product availability stages.
- [ ] CI green on final release commit; Vercel preview READY; public-route GET and private-route 404 smoke reports.
- [ ] Canonical auth and Supabase callbacks unaffected.
- [ ] Security review issue [#18](https://github.com/mnxtr/M_I_OS/issues/18) and launch [#36](https://github.com/mnxtr/M_I_OS/issues/36) remain explicit gates for confidential factory data.
- [ ] Document production release SHA, domain list, test evidence, approver and rollback target.

**Excluded:** Heroku provisioning, iOS App Store release, replatforming APIs and altering shared Supabase schema; these require separate work with their own verification.
