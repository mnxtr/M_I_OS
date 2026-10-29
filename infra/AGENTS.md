# Infrastructure Instructions

These rules apply to infra.

## Local-first operations

- Keep Docker Compose sufficient for one developer and one pilot.
- Prefer one Postgres-compatible database, pgvector, Redis only when a worker needs it, and S3-compatible object storage.
- Pin images or use controlled version ranges and document upgrades.
- Keep local and production environment names explicit.
- Never place credentials in Compose files, committed environment files, or examples.

## Deployment boundaries

- Vercel hosts the web application from apps/web.
- FastAPI and long-running workers run on a server-capable host.
- Supabase/Postgres policies, migrations, and Storage configuration are reviewed separately from local containers.
- Do not add Kubernetes, Terraform, Qdrant, or multi-region infrastructure until a measured pilot requirement justifies it.

## Recovery

Every infrastructure change states what data can be affected, how backups are taken, how to restore or roll back, what health check proves success, and who reviews production use.