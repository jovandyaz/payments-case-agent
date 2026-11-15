# Architecture decision records

Each record states one decision that shapes the system, what it was chosen over, and when to revisit it. The specs in `specs/` are binding and hold the detail; a record summarizes a decision they already make and points at the spec section, the code and the tests that hold it. [DESIGN.md §Trade-offs](../../DESIGN.md#trade-offs) keeps the one-line view.

Write a new record when a change alters a spec decision or a DESIGN.md trade-off: the next number, `NNNN-kebab-title.md`, with Status, Date, Context, Decision, Alternatives considered, Consequences (including when to revisit) and References. A replaced decision keeps its file with `Status: Superseded by NNNN`.

| #                                                          | Decision                                                                          | Status   | Date       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- | -------- | ---------- |
| [0001](0001-toolloopagent-over-own-loop.md)                | The harness runs on the AI SDK `ToolLoopAgent`, not an own loop                   | Accepted | 2026-10-05 |
| [0002](0002-postgres-queue-case-row-is-the-job.md)         | The case row is the job: a Postgres queue, not a job library or a workflow engine | Accepted | 2026-10-05 |
| [0003](0003-executor-in-its-own-container-and-role.md)     | Writes happen only in an executor with its own container, key and database role   | Accepted | 2026-10-05 |
| [0004](0004-closed-action-set-with-fact-predicates.md)     | Actions are a closed, value-free set, and a model's action needs a fact predicate | Accepted | 2026-10-05 |
| [0005](0005-case-bound-mcp-token.md)                       | MCP tools are bound to the case's customer by a short-lived, audience-bound token | Accepted | 2026-10-05 |
| [0006](0006-fail-closed-masking.md)                        | PII masking fails closed: every run of 8 or more digits is masked                 | Accepted | 2026-10-05 |
| [0007](0007-variant-decision-rule-before-the-first-run.md) | The model variant is chosen by a decision rule written before the first run       | Accepted | 2026-10-05 |
| [0008](0008-canaries-measure-rubber-stamping.md)           | Seeded canary proposals measure whether operators actually review                 | Accepted | 2026-10-05 |
