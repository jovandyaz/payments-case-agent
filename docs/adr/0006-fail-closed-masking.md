# 0006. PII masking fails closed: every run of 8 or more digits is masked

Status: Accepted · Date: 2026-10-05

## Context

Full CLABEs, card numbers, phones, RFC, CURP and authentication factors must never reach logs, traces or the model (G6). Payment DLPs gate card detection on the Luhn check, so a mistyped or deliberately altered number passes; Presidio lists spelled-out card numbers as unsupported; and none detects a CLABE.

## Decision

One pure function `maskPii(text)` in `packages/contracts`, applied at intake, on tool outputs before they leave the MCP server, at persistence, in the logger and in a span processor in front of every trace exporter.

- **Fail closed on numbers.** Every system identifier has a shape no personal number can have, so every other run of 8 or more digits is masked, whatever its check digit. Eight is below the shortest personal number (a 10-digit phone) with two digits of slack, and above every legitimate bare number in the domain.
- **Fold first, then count.** Unicode normalization, look-alike letters and digits, and the number words the tables cover are folded before matching; digit groups split by up to 3 characters are joined and digits are counted across the whole message; the model redactor at intake catches what the tables miss (a number spelled in a language or phrasing they do not cover).

## Alternatives considered

- **A Luhn-gated DLP (Presidio and similar).** Misses Luhn-failing numbers and CLABEs.
- **A per-case vault of full values.** The model never needs a full value, so there is nothing to vault for it.

## Consequences

- No run of 8 or more digits reaches the model, a log or a trace, whatever its check digit; a number its owner deliberately enciphers is the residual the spec accepts (02 §Residual risk).
- Legitimate figures can trip it: a reply whose dates pass the cap of 32 date digits (all or none) fails `PII_IN_REPLY` and falls back; the date cap residual stays a deliberate trade-off (EVALS.md).
- Revisit when a personal number shorter than 10 digits enters the domain, or when legitimate figures falling back becomes a cost EVALS.md reports; any change needs a test that fails first and explicit approval, since G6 is an invariant.

## References

- [specs/02-security.md §Guarantees in code](../../specs/02-security.md#guarantees-in-code) (G6), threat T4
- [DESIGN.md §Trade-offs](../../DESIGN.md#trade-offs) ("Fail-closed masking, ≥ 8 digits"), [EVALS.md](../../EVALS.md)
- Code: `packages/contracts/src/mask.ts`
- Tests: `packages/contracts/src/mask.spec.ts`, `apps/api/test/pii-sinks.e2e.spec.ts`
