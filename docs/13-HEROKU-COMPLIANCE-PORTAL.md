# Linora Compliance — Heroku deployment runbook

**Status:** Deployment-ready code proposal, **not** an authenticated live Heroku deployment.
**Scope:** Dedicated compliance entry point for the existing Next.js app; **not** an isolated database or a new compliance certification authority.

## 1. Diagnosis and repair

- The old compliance landing page called `ensureChecklistTemplates()` while *reading* the template list. That function always creates a privileged Supabase client and may insert rows. If `SUPABASE_SECRET_KEY` is absent, no checklists appear.
- Built-in templates now load from versioned application definitions without any startup or GET-time database mutation. Optional persisted templates are read through an authenticated client. **Creating an assessment still requires a server-only Supabase secret**, because it writes tenant-owned records.
- The new executive cockpit displays only recorded assessment counts, never dummy factory KPIs. An AI-suggested `compliant` verdict is now stored as `partial` pending human verification.
- The dedicated Heroku instance serves the same authenticated Next.js code and its compliance endpoints. `COMPLIANCE_PORTAL_MODE=true` redirects root `/` to `/compliance`; `NEXT_PUBLIC_COMPLIANCE_PORTAL_MODE=true` makes login default to the compliance workspace.
- `GET /api/health` is a public, non-sensitive heartbeat. It does **not** prove Supabase connectivity.

## 2. Runtime architecture

Factory executive browser → Heroku HTTPS / custom domain → Next.js web dyno → Supabase Auth + RLS-backed reads. Authenticated server route handlers perform tenant-checked writes using `SUPABASE_SECRET_KEY`; Groq is optional for CAP drafting and automated evidence suggestions. No Heroku PostgreSQL or persistent dyno disk is required.

The repo root contains a Node.js npm-workspace `package.json`, `Procfile`, and `app.json`:
- `heroku-postbuild`: `npm run build` (compiles the `mios-web` Next.js workspace).
- `Procfile`: `web: npm run start:heroku`.
- `start:heroku`: starts Next.js on `0.0.0.0` and Heroku's `PORT`, with port 3000 only as a local fallback.
- The root `app.json` supports new-app setup on the Heroku-24 stack. Heroku reads `app.json` at *creation*, not each subsequent deploy.

## 3. Manual deployment (requires authorized Heroku owner)

1. Review and merge the compliance PR into `main` after GitHub CI and a security review. Do not deploy the draft/untested branch as a production release.
2. From the repository root, sign in with `heroku login`, create/select a paid Heroku app, and connect its Git remote. Example:
   ```sh
   heroku create <YOUR-HEROKU-APP> --stack heroku-24
   heroku git:remote -a <YOUR-HEROKU-APP>
   ```
3. In **Heroku Dashboard → Settings → Config Vars**, set **before building**:
   - `COMPLIANCE_PORTAL_MODE=true`
   - `NEXT_PUBLIC_COMPLIANCE_PORTAL_MODE=true`
   - `NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = publishable key (safe for browser)
   - `SUPABASE_SECRET_KEY` = server-only restricted secret; never use a `NEXT_PUBLIC_` prefix
   - `NEXT_PUBLIC_SITE_URL=https://<your-heroku-app>.herokuapp.com` initially; update to custom HTTPS origin and redeploy when DNS is ready
   - `GROQ_API_KEY` (optional server-only key for AI actions)
   - `GROQ_DOCUMENT_MODEL` when using a Groq model actually available to the account
   - `NEXT_PUBLIC_API_URL` only if other Linora features use an independently deployed FastAPI backend; compliance route handlers do not require it.
4. From reviewed `main`, run `git push heroku main`. Verify the Heroku build output and web dyno startup; do not treat a successful compile as proof that login or assessment creation works.
5. Inspect `heroku logs --tail -a <YOUR-HEROKU-APP>` for startup failures (but never paste secrets into tickets).
6. Configure **Supabase Auth → URL Configuration**: allow the new site origin, `/callback`, and any used `/auth/callback` paths. Plan email OTP and password login tests with an authorized test account.
7. If you own a domain, add `compliance.<your-domain>` through `heroku domains:add compliance.<your-domain> -a <YOUR-HEROKU-APP>`, then create the exact DNS CNAME record Heroku returns. Verify routing and automatic TLS certification before switching `NEXT_PUBLIC_SITE_URL`. This project does not know or control your DNS registrar.
8. Update payment/SSO callback configuration only if used. Auth cookies from the original Vercel hostname do not transfer to the new Heroku origin: users must sign in separately.

## 4. Smoke checks

```sh
curl -i https://<YOUR-HEROKU-APP>.herokuapp.com/api/health
curl -I https://<YOUR-HEROKU-APP>.herokuapp.com/
```

Expected: non-sensitive JSON with status `ok` from `/api/health`, then a temporary redirect from `/` to `/compliance` in portal mode. Without a session, the compliance page should redirect to `/login?next=/compliance`. With an authorized **synthetic tenant** account, check: template list; create new assessment; edit requirement status; save CAP; source citations; and binder download. Audit and AI suggestions must never claim legal certification.

### Required security gate before customer data

- Verify read/write denial across two factory tenants using **valid user JWTs**, including storage objects, admin route handlers, and direct Supabase Data API access.
- Assess `SECURITY DEFINER` permissions in the shared Supabase database. Coordinate with the separate cricket-app owner before changing shared grants.
- Confirm that server-only Supabase secret is configured without public exposure, and that all privileged write queries carry verified tenant filters.
- Test backup restoration, secret rotation, full login lifecycle, and an actual run of the document ingestion pipeline.
- Do **not** move, truncate, force-RLS, or reseed the shared production database as part of this deployment.

## 5. Rollback

If the new web dyno fails, roll back the Heroku release using its release history; retain the prior working release while diagnosing. A revert of the GitHub PR removes the compliance-only redirect, health endpoint, UI and template changes. No schema migrations are introduced by this PR. Test rollback before customer onboarding.

## 6. Known limitations

- Heroku deployment and DNS/SSL cannot be asserted complete without authorized Heroku account access.
- A separate Heroku *origin* is not a separate Supabase database or an isolation boundary.
- `checklist_templates` may contain custom templates that authenticated users cannot read under RLS; the built-in packs are still available.
- Auto-assessment is best-effort and currently bounded by platform request timeouts; large checklists need an idempotent background-job redesign.
- A `200 OK` heartbeat proves only that the Node app is responding, not that signup, queries, or customer isolation work.

## References

- https://devcenter.heroku.com/articles/deploying-nodejs
- https://devcenter.heroku.com/articles/procfile
- https://devcenter.heroku.com/articles/app-json-schema
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://github.com/mnxtr/M_I_OS/issues/18
