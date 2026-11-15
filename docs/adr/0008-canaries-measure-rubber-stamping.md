# 0008. Seeded canary proposals measure whether operators actually review

Status: Accepted · Date: 2026-10-05

## Context

Every consequential action waits for an operator ([0003](0003-executor-in-its-own-container-and-role.md)), so the human gate is only as good as its reviewer. Automation bias is the expected failure (threat T11): an approve clicked in 3 seconds on a proposal that disputes the wrong charge. Asking operators whether they review does not measure it.

## Decision

Seed the inbox with canary proposals and measure each operator's catch rate:

- `pnpm canary:inject` posts one canary case per template through the webhook's intake, each with a `canary_cases` row naming its defect in the same transaction.
- The worker runs a canary through the real harness (tools, retrieval, validator, Persist) with a scripted model, so its lifecycle, trace, cost and flags come from the same code as a real case. Its resolution carries one defect the validator cannot catch by construction: the wrong transaction among the customer's own, `none` on a disputable charge, a supported but wrong action, a misstated policy, a wrong category, a cold tone.
- Approving a canary ends it `canary_missed`, rejecting it `canary_caught`; canaries never execute (G3), enforced by the transition trigger and skipped by the executor.
- An operator whose catch rate is below 100% over the last 20 raises an alert (`ops/alerts.sql`).

## Alternatives considered

- **Trusting the gate.** A gate assumed to work is the failure T11 describes.
- **Only forcing functions.** The transaction check-off on `high` tier reduces over-reliance but does not measure it; it is kept alongside canaries.

## Consequences

- Review quality is a number per operator, not an assumption.
- A canary's fabricated text never reaches the model provider, and a case holding a canary proposal without its `canary_cases` row is never claimed.
- Canaries must be indistinguishable from real cases, so their templates track the agent's action mix and phrasing; the worker refuses to start when its models differ from the run the canaries were calibrated on.
- Revisit the templates whenever the agent's behavior changes enough that a canary becomes recognizable.

## References

- [specs/02-security.md §Defense model](../../specs/02-security.md#defense-model), [§Threat model](../../specs/02-security.md#threat-model) (T11), [§Guarantees in code](../../specs/02-security.md#guarantees-in-code) (G3)
- [ops/README.md](../../ops/README.md)
- Code: `apps/api/src/canaries/`, `ops/alerts.sql`
- Tests: `apps/api/src/canaries/canary-run.e2e.spec.ts`, `apps/api/src/canaries/inject-config.spec.ts`
