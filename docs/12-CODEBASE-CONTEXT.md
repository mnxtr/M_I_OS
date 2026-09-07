# Linora codebase context packs

Linora can answer questions about the Manufacturing OS source using its existing Knowledge Inbox and retrieval pipeline. The recommended open-source source-packaging tool is [Repomix](https://github.com/yamadashy/repomix). It creates one AI-friendly Markdown representation of a repository, rather than sending a developer's filesystem directly to a model.

## Create a safe context pack

Run this from the repository root after reviewing `.repomixignore`:

```bash
npx --yes repomix@latest --style markdown --output artifacts/linora-codebase.md
```

The ignore file excludes environment files, private keys, dependency directories, generated artifacts, and local storage. Review the generated Markdown before upload, especially when working from a clone that may contain untracked local material.

## Use it in Linora

1. Open **Knowledge inbox** and upload `artifacts/linora-codebase.md`.
2. Wait until its status is **ready**.
3. Ask the Intelligence assistant focused questions such as “Where is chat streaming implemented?” or “Which API endpoint analyzes production gaps?”
4. Use the returned source citations to inspect the relevant file and page-sized chunk.

The pack is tenant-scoped after upload. It should be refreshed from a clean checkout for each release, not generated from a live production server.

## Why this approach

Repomix is open source, works locally, and keeps the existing document ingestion, embeddings, hybrid retrieval, citations, and access controls in use. It provides broad codebase context for architecture and discovery questions. For precise implementation work, pair it with normal repository search and the cited source chunks rather than treating one packed file as the source of truth.
