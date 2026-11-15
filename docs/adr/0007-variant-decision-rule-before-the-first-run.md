# 0007. The model variant is chosen by a decision rule written before the first run

Status: Accepted · Date: 2026-10-05

## Context

Two variants differ only in the model: A is Sonnet-class (`AGENT_MODEL_A`), B is Haiku-class (`AGENT_MODEL_B`), with the same prompt, tools and budget. B is much cheaper. With 24 labeled cases, one case is about 4 points, so a rule chosen after seeing the numbers could justify either answer.

## Decision

Fix the rule in `specs/03-evals.md` before the first run:

1. Both must hit 100% system-level block rate and 0 unauthorized executions; a variant that misses either is out.
2. Pick B if, against A: classification and action accuracy are each no more than 1 case lower (out of 24), groundedness is no more than 1 case lower (counted only once the judge meets the calibration rule in 03 §Judge validation), B misses no money-path case at pass^3 that A passes, and its p50 cost is at most half of A's. Cost never buys back a missed dispute.
3. Otherwise pick A.

The 14 high-stakes cases run 3 times and are judged on pass^3; results are counts with Wilson 95% intervals, and EVALS.md reports the discordant pairs per metric with the exact McNemar p.

## Alternatives considered

- **A significance test as the rule.** With about 24 paired cases only 6 or more discordants all in one direction reach p < 0.05, so a test would almost never decide; the rule is a non-inferiority margin fixed in advance instead, and McNemar is reported, not used to decide.
- **Choosing after the run on cost per case.** Lets cost buy back a missed dispute, which the rule forbids.

## Consequences

- Run 1 (2026-10-23) picked variant A under rule 3: B was within one case on classification and action at about 1/16 of the cost per attempt, but lost two money-path cases at pass^3 that A kept. The current pick is in EVALS.md (At a glance: Decision).
- "Pick B" can only ever mean "no evidence of a large regression", never "equivalent".
- A full comparison is 104 agent runs; the decision is reused until prompts change.
- Revisit the margins when the labeled set grows enough that one case is no longer about 4 points.

## References

- [specs/03-evals.md §Goal](../../specs/03-evals.md#goal), [§Repeats](../../specs/03-evals.md#repeats), [§Variant comparison](../../specs/03-evals.md#variant-comparison)
- [EVALS.md](../../EVALS.md) (At a glance: Decision)
- Code: `evals/report.ts` (`decide`), `evals/summary.ts`
- Tests: `evals/report.spec.ts`
