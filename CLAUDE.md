@AGENTS.md

## Claude Code specifics

- Work follows `docs/roadmap.md`, one bolt at a time, each with its own plan under the git-ignored `.superpowers/sdd/`. Progress and every deviation (`Ruling:` lines) live in that plan's ledger; after a compaction, trust the ledger and `git log` over memory.
- Subagents follow the roster in `docs/agent-setup/`: judgment-heavy work (gate, executor, validator) is never delegated blind; review the diff with `invariant-reviewer` before committing it.
- The step sequence in AGENTS.md §Working rules is mandatory; run it through the Skill tool (`workflows:developing-feature`, `workflows:reviewing-pr`, `workflows:verifying-change`, `workflows:committing-change`) and dispatch `invariant-reviewer` with read-only instructions (no test runs).
- Use Context7 (`.mcp.json`) for library docs and the local read-only Postgres MCP to inspect data; never point it at anything but the compose database.
