# Roadmap

Payments Case Agent is heading to an MVP. Work ships in bolts: a cohesive, mergeable unit of a few days, each with its own plan, review and verification. Priority: **P0** quick win or visibility, **P1** important hardening, **P2** later. Effort: **S** ≤ 1 day, **M** 2–5 days, **L** 1–3 weeks.

## Already in place

- **Security:** threat model T1–T12 and guarantees G1–G8 ([02](../specs/02-security.md)); mapping to OWASP LLM Top 10 2025, OWASP Agentic Top 10, LFPDPPP, PCI DSS and Banxico/CONDUSEF ([compliance](compliance.md)); fail-closed masker, model redactor at intake, PII scanners for logs and traces.
- **Evals:** promptfoo over 24 labeled cases (14 normal, 10 adversarial); pass^3 on the high-stakes set, Wilson intervals, McNemar; regression gate on `evals/baseline.json`.
- **Judge:** groundedness LLM-as-judge with blind calibration (52 rows); informational until TNR ≥ 0.9.
- **Operations:** canaries that measure rubber-stamping; an executor in its own container with its own database role and idempotent writes; an MCP server bound to the case token; alert and metric SQL in `ops/`; traces in Postgres with tokens, cost and latency per step.

## P0

| #   | Item                                    | Effort | Notes                                                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Rename to payments-case-agent           | M      | Done: repo, packages `@payments-case-agent/*`, product name.                                                                                                                                                                                                                                                                                                       |
| 2   | Own the framing                         | M      | Done: fictional Brisa brand in the data, fresh eval baseline.                                                                                                                                                                                                                                                                                                      |
| 3   | New README                              | S      | Problem, the architecture diagram from DESIGN.md, headline results, a "what is here" map, quickstart.                                                                                                                                                                                                                                                              |
| 4   | ADRs in `docs/adr/` (5–8 plus an index) | S–M    | From the DESIGN.md trade-off table and the build rulings: `ToolLoopAgent` vs a custom loop or LangGraph; Postgres as the queue vs Temporal/DBOS; separate executor with its own role; closed action set with fact predicates; case-bound MCP token; fail-closed masker; variant decision rule; canaries.                                                           |
| 5   | CI on GitHub Actions                    | M      | Done: every pull request and every push to `main` runs `pnpm verify`, the Testcontainers integration tests and the Playwright e2e on the compose stack (which also checks every image builds), on Node 24 only; the paid eval runs on `workflow_dispatch` with the API key as a secret; lefthook hooks replace the commit gate; Renovate with a 3-day release age. |

## P1

| #   | Item                                                   | Effort | Notes                                                                                                                                               |
| --- | ------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6   | Export the existing OTel spans to Langfuse (OTLP HTTP) | S–M    | `apps/api/src/agent/core/telemetry.ts` already has `maskingSpanProcessor`; missing are the exporter and moving the OTel packages to `dependencies`. |
| 7   | p50 time-to-decision dashboard and a re-contact metric | S      | The only defined metrics not built yet.                                                                                                             |
| 8   | Calibrate the judge to TNR ≥ 0.9 and make it a gate    | M      | Needs more labels and a rubric pass.                                                                                                                |
| 9   | Broaden the red team with promptfoo's redteam plugin   | M      | Listed in DESIGN.md under "with more time".                                                                                                         |
| 10  | Deploy to AWS                                          | L      | Today it runs on docker compose only. ECS Fargate + RDS or App Runner, minimal Terraform.                                                           |

## P2

| #   | Item                                                                          | Effort | Notes                                                                |
| --- | ----------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------- |
| 11  | Use the Knowtis model router as a second consumer, with Bedrock as a provider | M      | Depends on the router MVP. Today the agent calls Anthropic directly. |

## Ruled out

- **Migrating to LangGraph.** It contradicts a documented decision (`ToolLoopAgent` plus a state machine in Postgres).
