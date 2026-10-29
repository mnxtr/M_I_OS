# Evaluation Instructions

These rules apply to evals.

Evaluations measure whether MIOS retrieves and explains factory evidence correctly. They do not replace authorization, integration, or customer UAT.

- Keep golden questions, expected evidence, language, tenant, and rubric explicit.
- Include English, Bangla, and Banglish where supported.
- Include numeric aggregation, multi-document reasoning, citation correctness, and abstention.
- Use sanitized or synthetic fixtures unless repository use is explicitly authorized.
- Use a dedicated non-production database and least-privilege role.
- Fail closed when required configuration is missing.
- Report hit@k, MRR, citation precision, faithfulness, latency, and cost where available.
- Never create a baseline from the same unreviewed output being evaluated.
- Record model, prompt, retriever, embedding, and dataset versions.