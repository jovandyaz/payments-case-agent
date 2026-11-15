# 0003. Writes happen only in an executor with its own container, key and database role

Status: Accepted · Date: 2026-10-05

## Context

The agent reads untrusted customer text and policy content, so its process must be assumed compromisable. The only consequential effects (opening a dispute, resending a CEP, escalating fraud) are writes to the core banking API, and each must happen once, only after an authenticated operator approves it.

## Decision

Separate the write path from the agent at two levels (G1) and make the effect happen once (G3):

- **Code boundary.** The write client `CoreWriteClient` lives in `executor/`. ESLint forbids importing it or `executor/` from `agent/` and from the eval runner, and forbids `executor/` importing `agent/`, statically, dynamically or through loaders that bypass `import`; CI fails on a violation. This is a tripwire for plain-sight imports, not a defense against obfuscation.
- **Process boundary.** The executor is its own compose service (same image, entrypoint `apps/api/src/executor/main.ts`) and the only container with `CORE_EXECUTOR_KEY`; `api` refuses to start with that variable set, and core-mock rejects writes without it.
- **Database roles.** `payments_api`, `payments_executor` and `payments_mcp` each get only the grants their job needs; the trigger `enforce_transition_role` allows `approved → executed | failed` only to `payments_executor` on a non-canary row.
- **Once.** The `approved` row is the outbox record. The executor claims it with `SKIP LOCKED`, re-validates the action against fresh core-mock data and calls core-mock with `Idempotency-Key: <action_id>`; a sweeper retries with the same key.

## Alternatives considered

- **One process.** Fewer containers, but a compromised `api` would hold the write key.
- **Approval checked in the agent's process only.** Leaves the decision and the effect in the same trust domain the injection reaches.

## Consequences

- A compromised `api` can at most mark a G2-valid proposal approved; the executor still re-validates it and the audit log records it.
- Four services instead of one, and three Postgres roles to keep in step with the schema.
- The design leans on the agent being unable to write; the trade-off in [0004](0004-closed-action-set-with-fact-predicates.md) holds only while this does.
- Revisit if the agent ever needs a write tool: that is a new threat model, not a configuration change.

## References

- [specs/02-security.md §Guarantees in code](../../specs/02-security.md#guarantees-in-code) (G1, G3), threat T12
- [DESIGN.md §Trade-offs](../../DESIGN.md#trade-offs) ("4 services")
- Code: `apps/api/src/executor/main.ts`, `apps/api/src/executor/core-write-client.ts`, `apps/api/src/executor/revalidate.ts`
- Tests: `apps/api/test/roles.int.spec.ts`, `apps/api/test/compose.spec.ts`, `apps/api/test/g1-lint.spec.ts`, `apps/api/src/executor/executor.int.spec.ts`, `apps/api/src/approvals/approvals.int.spec.ts`
