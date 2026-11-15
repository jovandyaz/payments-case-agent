# 0004. Actions are a closed, value-free set, and a model's action needs a fact predicate

Status: Accepted · Date: 2026-10-05

## Context

An injection in customer text, a policy document or a third-party field of a tool output can try to steer the agent toward an action: "refund $5,000 to CLABE …", "escalate to fraud". Blocking the words does not scale; what matters is which actions the data actually supports.

## Decision

- **Closed and value-free (G2).** `ProposedAction.type ∈ {open_dispute, resend_cep, escalate_fraud, none}`. No amount, CLABE, account, recipient or free-text instruction field exists; refunds do not exist. The executor derives every value from `transaction_ids`, which it re-reads from core-mock.
- **Fact predicates.** Code computes which actions the structured fields of tool outputs the run actually received support, for example a `get_spei_status` output with `status = settled` and `cep_available = true` for `resend_cep`. Customer text and policy prose never satisfy a predicate. A model proposal without one fails validation with `ACTION_UNSUPPORTED` (G5).
- **Operator override.** A person may know what the tools did not show: an override needs an allowed combination and ownership of the transactions, not the predicate (G3).
- **Visible remainder.** A `none` on a seen, disputable card purchase with fewer than 2 auth factors in an unrecognized-charge case (or a fallback), on a seen `card_blocked_fraud` decline, or under the card-not-present burst raises the flag `action_fact_mismatch` (not a block) and the review tier to `high`.

## Alternatives considered

- **Dual-LLM or CaMeL.** Separates a privileged planner from untrusted data, at a model call per tool result. Here the planner has nothing dangerous to do ([0003](0003-executor-in-its-own-container-and-role.md)), so privilege separation plus predicates buys the same property more cheaply.
- **Filtering instructions out of untrusted text.** Detection is a signal at intake, not a guarantee.

## Consequences

- An injection can no longer add an action or a transaction the data does not support.
- It can still pick the wrong action among supported ones or suppress one; that remainder is made visible (`action_fact_mismatch`, operator override, eval ADV-09) rather than claimed away.
- Holds only while the agent cannot write. Revisit with Dual-LLM or CaMeL for a write-capable agent.

## References

- [specs/02-security.md §Defense model](../../specs/02-security.md#defense-model), [§Guarantees in code](../../specs/02-security.md#guarantees-in-code) (G2, G3, G5)
- [DESIGN.md §Trade-offs](../../DESIGN.md#trade-offs) ("Privilege separation plus fact predicates")
- Code: `apps/api/src/agent/core/validate/predicates.ts`, `apps/api/src/agent/core/validate/flags.ts`, `apps/api/src/agent/core/validate/actions.ts`, `apps/api/src/executor/revalidate.ts`
- Tests: `apps/api/src/agent/validate.spec.ts`, `apps/api/src/executor/revalidate.spec.ts`, `apps/api/src/approvals/approvals.int.spec.ts`
