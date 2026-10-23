# 00 — Scope

## Goal

Payments Case Agent is a personal project heading to an MVP: an agent that investigates a payments support case for a Mexican IFPE with read-only internal tools and policies, proposes a resolution, and leaves every consequential action to a human in ops. The roadmap from here is [docs/roadmap.md](../docs/roadmap.md).

Priority order when trade-offs arise: security and evals first, then harness reliability, then breadth of dataset, then UI.

## In scope

| # | Requirement | Slice we build |
| --- | --- | --- |
| 1 | Simulated internal system | Seeded generator → committed JSON (20 customers, ~200 movements: SPEI in/out, card purchases; states settled, pending, returned, rejected). A tiny mock core API serves it. |
| 2 | Tools via MCP | One MCP server, four read-only tools: `get_customer`, `list_transactions`, `get_spei_status`, `get_card_authorization`. Protocol 2026-07-28 (stateless Streamable HTTP), MCP SDK v2. |
| 3 | RAG knowledge base | 10 synthetic policy docs in Markdown (8 clean, citing the real regulation where one exists, plus 2 poisoned on purpose) under a hashed manifest, chunked by section, Spanish full-text search with accent folding, recall measured by a test. Mandatory citation with a verbatim quote, or explicit abstention. |
| 4 | Agent | Investigates, classifies, drafts a reply, optionally proposes one structured action with justification. |
| 5 | Ops console | Operator sign-in with a per-operator token, inbox, "new case" form (posts through the webhook), run / re-run agent on any case, case view with trace (tool calls + reasoning summary), editable reply, transaction check-off on `high` tier, action override, approve / reject with the effect named on the button. |
| 6 | Inbound webhook | `POST /webhooks/tickets`, Standard Webhooks signature with replay window, async processing, idempotent on retries. |
| — | Safety model | Read-only agent whose actions must be supported by data, typed proposals, human gate with authenticated operators and canary proposals, executor in its own container, untrusted content as data, fail-closed PII masking. See 02. |
| — | Evals | 24 labeled cases (10 adversarial, one through a tool output), one-command runner, two variants compared with intervals, regression gate on the high-stakes set. See 03. |
| — | Docs | DESIGN.md, EVALS.md, PLAYBOOK.md, AI_NOTES.md, README with one-command start. |

## Explicitly cut (and why)

| Cut | Why |
| --- | --- |
| Auth / SSO | Not needed before a real deployment. Minimal per-operator bearer tokens replace a stub header, so every approval is attributable (02 G3); OIDC with MFA is in DESIGN.md. |
| Real ticketing, real messaging, real money movement | Mocked. The executor writes to the mock core only. |
| Streaming UI, websockets | Polling is enough for an inbox; streaming adds failure modes without changing any evaluated guarantee. |
| Multi-agent orchestration, long-term memory, conversation threads | One case = one run. Not needed to answer a case; each adds attack surface. |
| Dual-LLM / quarantined-LLM pattern | Considered. Privilege separation plus a deterministic gate gives the guarantee and is testable without an LLM. Documented as "with more time" in DESIGN.md. |
| Model failover chains, BYOK, quotas | Exists in Knowtis; over-building here. Single model per variant, bounded retries. |
| Vector retrieval, hybrid RRF | 10 short docs; Spanish full-text search with accent folding finds the right section and keeps ingestion key-less. Added when `retrieval.spec.ts` recall@4 drops below 0.9 or the corpus passes ~50 docs (needs the `pgvector` image). |
| Redis / external queue, durable-execution engine | The case row is the job, so one state machine; a read-only loop of ≤ 8 steps restarts for the cost of tokens. pg-boss, DBOS or Temporal are in DESIGN.md for when the executor or job types grow. |
| Polished UI, multi-language, fine-tuning | Not needed to prove the safety model. Cloud deployment with IaC is on the roadmap. |

## Assumptions (documented, not asked)

1. Cases, replies, policy docs and the console are in Spanish (Mexico). Code, specs and docs are in English, PLAYBOOK.md included, which is written for people who are not AI experts. The snapshot of the global agent setup in `docs/agent-setup/` keeps its source language.
2. One webhook event = one case. The emitter retries with the same `event_id`.
3. Actions are limited to three: open a dispute (aclaración), resend a CEP receipt, escalate to fraud. None of them moves money; all still require approval because they touch customer data or trigger downstream work.
4. A refund is not an action the agent can propose at all. A request for one is answered with the policy path (dispute) or escalated. The regulated credit for an unrecognized charge (Banxico Circ. 12/2018, 18.a: by the 2nd business day unless two-factor authentication is proven) is part of the dispute process `open_dispute` starts, not an agent action; the reply may state it only through the `{{compromiso_abono}}` placeholder, which the harness renders when its predicate holds (02 G5).
5. Evals run with the user's own API key; unit and integration tests run with no key.
6. A single ops operator works a case at a time; no concurrent-edit handling beyond optimistic state checks.
7. The operator is a Mexican IFPE (the fictional Brisa in the dataset), so LTOSF art. 23 (aclaraciones), Banxico Circ. 12/2018 (IFPE operations), Circ. 14/2017 (SPEI) and the CNBV–Banxico IFPE rules apply. The synthetic policy docs use the real deadlines from those texts, cited, and are marked synthetic. Sources in [references.md](references.md).
8. Intake is the customer's notice. The legally required acknowledgment (acuse with folio) is an automatic template at intake, never gated on the agent; sending it is mocked. The agent's draft is never the dictamen. Legal should confirm the "intake = notice" reading.

## Reuse from Knowtis (declared)

Code is ported from my open-source project `jovandyaz/knowtis-app` (MIT) only where porting is faster than writing and brings no Knowtis coupling. Each port lands in its own commit with the `port` scope (`feat(port): …`), comes with its tests, and is listed in AI_NOTES.md and DESIGN.md.

Audited on 2026-10-05 for imports, debt markers, tests, fix history and version drift (Knowtis runs ai 7.0.85, MCP SDK 1.29, promptfoo 0.121, Langfuse 5.11; this repo targets the versions in 01). `<api>` = `apps/api/src/modules/`, `<eval>` = `<api>/agent/eval/`.

| Piece | From | Verdict and trim |
| --- | --- | --- |
| Injection guard + corpus | `packages/ai-gateway/src/guard/` (no imports, 111 tests) | **Port with trim** (~330 LOC with tests): drop the windowing-only exports (`locateInjectionPatterns`, spans, scopes, `runAnchored`) and their tests; swap Knowtis-specific benign strings for fintech ones; carry over the known quoted-phrase false positive as a documented case. NFKC + zero-width/bidi only, no homoglyph folding: a signal, never the guarantee |
| MCP `annotations.ts` | `apps/mcp/src/tools/` | **Port as is** (27 LOC) if its types fit SDK v2; otherwise rewrite the four hints inline |
| MCP wrapper, error format, server, transport | `apps/mcp/src/` | **Rewrite** (~90 LOC), using Knowtis as reference. Porting would drag OAuth, `AuthService`, `ApiError`, Hono, ~520 LOC and the v1 SDK. Use SDK v2 `createMcpHandler` with a server per request and `registerTool`. Never log any part of the case token |
| Eval runtime | `<eval>/runtime/eval-runtime.ts` (+ 846-line spec, a key-less promptfoo spec) | **Port with trim**: `runEvalSuite`, `summarizeTrials`, `toTrialResult`, `caseKeyOf`. Key cases by `case_id` + provider so variants don't merge; read `tokenUsage` and `cost` from the provider response; take repeats and variants from flags; a missing key exits non-zero; git SHA from `git rev-parse`. Re-check the result shape against promptfoo 0.124 |
| Judgment export + agreement | `<eval>/calibration/` (`agreement.ts`, `judgment-row.ts`, `judgment-extract.ts`, CLIs; 16 tests) | **Port with trim** (~270 LOC): inline `caseKeyOf`, key rows by case and variant, first attempt only, add mutation negatives, report TPR and TNR with Wilson intervals (kappa secondary); the 7 known-bad controls are a separate gate |
| Exfiltration link scanner | `<eval>/assertions.ts` (`assertNoExfiltrationLink` and helpers, ~90 LOC + ~217 lines of bypass tests) | **Port with trim** into the validator as `LINK_IN_REPLY`: "host not in the Brisa allow-list" instead of "attacker host"; add raw HTML and bare-domain detection |
| Scripted model fixtures | `ai-sdk-agent.final-step.spec.ts`, `byok-key-failure.spec.ts` (inline helpers) | **Port with trim** into `test/mock-model.ts`: `MockLanguageModelV4` usage and finish shapes for ai v7, `inOrder`, a `429` with `retry-after-ms: 0`; drop the fallback-chain wiring |
| Token cost | `packages/ai-gateway/src/catalog/compute-token-cost.ts`, `turn-usage.ts` (+ tests) | **Port as is** (~95 LOC): USD per call with separate cache-read and cache-write pricing. The dated price table is new |
| JSON logger + DB error redaction | `apps/api/src/core/logging/json-console-logger.ts`, `core/errors/{reason-of,stack-of,database-diagnostics}.ts` | **Port with trim**: add `maskPii`, `authorization` header and case-token redaction in `printMessages` (the logger sink of 02 G6); drop `rewrite-database-errors.ts` and the Railway naming |
| Drizzle module, migrate CLI, unique-violation check | `apps/api/src/database/`, `drizzle.config.ts` | **Port with trim**: drop the advisory lock and lock retry from `migrate.ts` (seed is one-shot); `isUniqueViolation` backs at-most-once execution |
| HTTP exception filter | `apps/api/src/core/filters/http-exception.filter.ts` | **Port with trim**: keeps `413` and `415` from becoming `500` (the 32 KB webhook limit), hides 5xx details; drop `RetryAfterHttpException` |
| Langfuse bootstrap, record-content switch | `<api>/observability/langfuse-tracing.service.ts`, `redacted-telemetry.ts` (11 tests) | **Port with trim**, optional (cut #1): drop `EnvConfig` and `reasonOf`, **add the `mask`** Knowtis never passed |
| Stop hook | `tools/claude-stop-typecheck.mjs` (+ 24 `node:test` tests) | **Port with trim**: call `pnpm verify` instead of `nx affected`, keep the 2-block cap, update the tests that assert Nx args |
| CLAUDE.md, `.claude/rules/` | Knowtis root | **Rewrite** (~60-line CLAUDE.md, 4 rules ≈ 200 lines): the originals carry Nx, neverthrow, CASL, Yjs, Socket.IO, Railway and `@knowtis/*` content that would be debt here |
| Vitest unit / database projects, env helpers, constant-time compare, skill layout | `apps/api/vitest.config.ts`, `config/env.config.ts` (`withoutBlankValues`), `ai/model-gate-token.guard.ts`, `.agents/skills/` | **Reference only**: the shapes are reused, the code is not |

Not taken, on purpose: the step loop, model chain and error classification (built around streaming, fallback and BYOK; the provider error mapping here is ~20 new lines); the eval harness wired to Nest `TestingModule`; `assertInjectionNotObeyed` (checks a canary word, while ADV cases here judge the action taken); HITL, turn claims and queues (Redis-based); health and backoffice UI pieces (bring Terminus, Swagger and the design system); RRF and hybrid retrieval (dead code with 10 docs; named in DESIGN.md "with more time"); model catalog, quotas, websockets, memory, OAuth, the LLM injection classifier, the windowed scanner. Knowtis has no Testcontainers setup; that is new work.

