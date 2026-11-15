# 0001. The harness runs on the AI SDK `ToolLoopAgent`, not an own loop

Status: Accepted · Date: 2026-10-05

## Context

The agent investigates one case in a bounded loop: at most 8 steps, a cost and input-token ceiling, a wall-clock timeout per attempt, one repair turn when the validator rejects the output, and a structured `ResolutionSchema` at the end. The core is plain TypeScript with no Nest DI, because the eval runner calls it directly. The loop is read-only: every consequential action waits for a human (see [0003](0003-executor-in-its-own-container-and-role.md)).

## Decision

Use AI SDK 7 `ToolLoopAgent` with `output: Output.object({ schema: ResolutionSchema })` in `apps/api/src/agent/core/agent.ts`:

- The budget is expressed as `stopWhen` conditions: the steps left of the run's 8, a custom `overBudget` over the steps' usage, a second failure of one MCP tool, under 5 s left in the attempt.
- `prepareStep` sets `activeTools: []` on the last allowed step to force the synthesis; never `toolChoice: 'required'`, which current Opus and Sonnet models reject with `400`.
- `RUN_TIMEOUT_MS` bounds the attempt through the SDK's `timeout: { totalMs, stepMs, toolMs }`, so the claim lease and the case token always outlive it.
- Workflow state (queue, approvals, execution) lives in Postgres, not in the agent framework ([0002](0002-postgres-queue-case-row-is-the-job.md)).

## Alternatives considered

- **An own tool loop.** Full control, but it re-implements stop conditions, per-step timeouts and structured output that the SDK already covers and tests.
- **LangGraph.** A graph runtime with its own state and checkpoints would be a second state machine next to the one in Postgres; the roadmap rules the migration out for that reason.
- **AI SDK `toolApproval` for the human gate.** Rejected: approval must survive restarts, belong to a named operator and be auditable days later, which is a database state machine, not a message in a turn.

## Consequences

- Budgets, timeouts and the forced synthesis are a few lines of configuration over SDK primitives.
- Loop semantics follow the SDK: the models reject a forced tool choice and the provider package downgrades it to `auto`, so the synthesis is forced by removing tools instead.
- A repair is a new user turn appended to the run's messages; earlier turns are never edited, because thinking blocks are bound to the exact prefix.
- Revisit when the SDK's loop can no longer express a budget or stop rule the specs require.

## References

- [specs/01-architecture.md §The agentic node](../../specs/01-architecture.md#the-agentic-node), [§Stack and verified APIs](../../specs/01-architecture.md#stack-and-verified-apis)
- [DESIGN.md §Trade-offs](../../DESIGN.md#trade-offs)
- Code: `apps/api/src/agent/core/agent.ts`, `apps/api/src/agent/core/run-case.ts`
- Tests: `apps/api/src/agent/agent.spec.ts`, `apps/api/src/agent/core/run-case.int.spec.ts`
