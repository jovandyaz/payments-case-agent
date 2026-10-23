# Specs — Payments Case Agent

The design, written before the code. Read in order; each file is the contract for one part of the system.

| File | What it fixes |
| --- | --- |
| [00-scope.md](00-scope.md) | What is in, what is cut, assumptions, reuse from Knowtis |
| [01-architecture.md](01-architecture.md) | Components, data model, agent pipeline, context policy, failure handling, stack and verified APIs |
| [02-security.md](02-security.md) | Threat model, the guarantees that live in code, residual risk, required tests |
| [03-evals.md](03-evals.md) | Labeled set, metrics, runner, judge validation, variant comparison |
| [references.md](references.md) | Regulatory, security and industry sources, and what each changed |

What comes next is in [docs/roadmap.md](../docs/roadmap.md). A change to a spec is its own commit with the reason.
