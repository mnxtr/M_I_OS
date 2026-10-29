# Backend Test Instructions

These rules apply to apps/api/tests.

## Priority

Test the riskiest contract first:

1. tenant isolation and authorization;
2. authentication and role checks;
3. document and processing state transitions;
4. read-only SQL and query limits;
5. citation and retrieval behavior;
6. billing callbacks and plan activation.

## Safety

- Never use production or shared customer databases.
- Use deterministic fixtures and fake providers by default.
- Keep real provider calls opt-in and separate.
- Never commit real JWTs, credentials, customer files, or personal data.
- Use two tenants and assert both allowed and denied behavior.
- Reset or isolate database state between tests.

## Quality

- Assert behavior rather than implementation details.
- Include malformed input, empty data, timeouts, retries, and provider failures.
- Keep tests fast enough for pull requests.
- Add a regression test for every security or data-isolation fix.
- Name tests after the user or security property they protect.