# MIOS staged-release verification

> Scope: review and staging preparation only. This document does not authorize
> changes to shared Supabase schemas, GitHub `main`, or Vercel production.

## Release dependency order

1. [Phase 1: Authorization and payments](https://github.com/mnxtr/M_I_OS/pull/19)
2. [Phase 2: Hybrid retrieval ordering](https://github.com/mnxtr/M_I_OS/pull/21)
3. [Phase 3: Bounded uploads](https://github.com/mnxtr/M_I_OS/pull/22)
4. [Phase 4: Evidence-backed evaluation](https://github.com/mnxtr/M_I_OS/pull/23)

The PRs are stacked; review and merge them in order, resolving/rebasing
downstream branches after each upstream merge.

## Supabase staging verification

- Use a **dedicated non-production Postgres/Supabase database** containing
  disposable test tenants. The connected project contains unrelated applications.
- Create/verify a separate API role without `BYPASSRLS`; do not use `postgres`
  or `service_role` to demonstrate isolation.
- Check RLS and policies for `tenants`, `profiles`, `documents`, `chunks`,
  `table_sources`, `table_rows`, `payments`, and `guest_tokens`.
- Verify tenant A cannot read, modify or link tenant B's documents, storage,
  chunks, records, payments, or guest tokens. Include authenticated and
  anonymous-session cases, with authorized test identities.
- Confirm paid-plan changes require verified settlement; no tenant-controlled
  plan mutations or payment-success switches remain.
- Review exposed `SECURITY DEFINER` functions, executable grants and owner
  privileges before considering schema changes.

Record reproducible fixture IDs/test outcomes without publishing private
factory data, environment values, tokens or connection strings.

## Retrieval quality gates

The nightly workflow requires repository secrets named
`STAGING_DATABASE_URL` and `STAGING_EVAL_TENANT_ID`. Missing configuration
causes a **failed** job rather than a green skipped evaluation.

`evals/baseline.json` is intentionally absent until an authorized benchmark
has been run on staging fixtures. To propose a baseline (after configuring a
read-only staging URL and the test tenant ID in your environment):

```sh
cd apps/api
python ../../evals/run_eval.py --candidate-baseline
```

This prints a **candidate** metric JSON without writing a file or changing the
database. Review provenance, retrieval cases and expected filenames before
adding an approved `evals/baseline.json` to Git. Ordinary nightly evaluation
compares Hit@8 against that reviewed baseline and fails if it regresses by
more than two percentage points.

The default golden set is only a sample and should not be reported as evidence
of production-level accuracy. Establish representative Bangla, Banglish,
English, noisy OCR, and spreadsheet cases, then verify actual citation/source
matching and correct abstentions.

## Vercel deployment gate

- An existing Vercel project named `mios-manufacturing-pilot-preview` was
  observed on 24 October 2026, but its deployment logs were not accessible to
  this integration. Do not create a duplicate based on incomplete listings.
- Confirm the authenticated team, project, linked repository, branch, root
  directory (`apps/web`) and effective environment settings in Vercel before
  any deployment or configuration change.
- Keep the existing portfolio project independent. Host FastAPI and durable
  workers on an appropriate long-lived backend rather than treating Vercel
  functions as queue workers.
- Resolve failed Vercel checks and run successful preview browser/API tests
  before proposing any production promotion.
- Use protected environments, reviewed commits, validated rollback procedures,
  runtime error monitoring, and documented approvals.

## Promotion rule

A successful lint/build job is not a successful tenant-isolation, pgvector or
production deployment test. Do not merge/release solely because GitHub CI is
green. Record the reviewed commit SHA, staging results and approvals for each
release candidate.
