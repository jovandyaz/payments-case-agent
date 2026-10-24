# Security policy

## Reporting a vulnerability

Report it privately through GitHub: the **Security** tab of this repository, then **Report a vulnerability** (private vulnerability reporting). Please do not open a public issue for it.

Include what you did, what happened and what you expected, with the smallest reproduction you have.

## Scope

In scope is the code in this repository.

Not findings:

- The data. Every customer, account, card and transaction in `data/` is synthetic.
- The keys and passwords in `.env.example` and `docker-compose.yml`. They are public development placeholders for the local stack, not credentials of any running system.

## Priority

Highest priority is any way around the guarantees G1–G8 in [specs/02-security.md](specs/02-security.md): a write path from the agent, an action outside the closed set or unsupported by tool data, an execution without an authenticated operator's decision or more than once, another customer's data through the MCP tools, a model output the validator lets through, unmasked PII in logs, traces or model input, customer or policy text acting as instructions, or hidden policy content reaching retrieval.
