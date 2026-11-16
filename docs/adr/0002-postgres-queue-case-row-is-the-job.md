# 0002. The case row is the job: a Postgres queue, not a job library or a workflow engine

Status: Accepted · Date: 2026-10-05

## Context

A signed webhook creates a case; a worker must investigate it, retry on failure and never lose or double-run it. The investigation is a read-only loop of at most 8 steps ([0001](0001-toolloopagent-over-own-loop.md)), and the case already has a status the console and the approval flow depend on.

## Decision

The `cases` row is the job (`apps/api/src/agent/core/queue.ts`):

- The webhook inserts the event and the case with `status = 'queued'` in one transaction, so there is no separate enqueue step and no window where the event is recorded and the job is lost.
- A worker claims with `SELECT … FOR NO KEY UPDATE SKIP LOCKED` a case that is `queued` or holds an expired lease, sets a fresh `claim_token`, a lease of `RUN_TIMEOUT_MS + 30 s` and one more attempt.
- Every write of an attempt locks the case row and requires its `claim_token` (fencing), so a worker whose lease expired cannot overwrite the attempt that replaced it.
- Up to 3 attempts with `min(2^attempt × 10 s, 5 min)` backoff and ±20 % jitter; then `failed`, with a re-run button in the console.
- Eval cases are never claimed by the worker; the eval runner claims its own by id.

## Alternatives considered

- **pg-boss.** It can enqueue inside the same Drizzle transaction, so atomicity is not the reason against it; the reason is a second store whose job state must be reconciled with the case status.
- **A durable-execution engine (Temporal, DBOS, AI SDK `WorkflowAgent`).** Not needed for a read-only loop: restarting it costs tokens, not correctness.

## Consequences

- Job state and case status are one state machine with one source of truth.
- Leases, fencing and backoff are code this repo owns and tests.
- No dead-letter queue or heartbeats beyond the lease.
- Revisit when job types grow or a dead-letter queue is needed: move to pg-boss.

## References

- [specs/01-architecture.md §Webhook and queue](../../specs/01-architecture.md#webhook-and-queue), [§Failure handling](../../specs/01-architecture.md#failure-handling)
- [DESIGN.md §Trade-offs](../../DESIGN.md#trade-offs)
- Code: `apps/api/src/agent/core/queue.ts`, `apps/api/src/agent/core/worker.ts`
- Tests: `apps/api/src/agent/core/queue.spec.ts`, `apps/api/src/agent/core/queue.int.spec.ts`, `apps/api/src/agent/core/worker.spec.ts`
