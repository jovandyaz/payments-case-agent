# Contributing

## Run it

`pnpm start` checks the prerequisites, writes `.env` from `.env.example` and brings the whole stack up with sample cases. The [README](README.md) has the details.

## Before a pull request

- The specs in `specs/` are binding. A change in behavior starts from them; a spec change is its own `docs:` commit with the reason.
- Run `pnpm verify` (typecheck, lint, unit and hook tests) and `pnpm test` (adds the integration tests; needs Docker). `pnpm install` sets up git hooks that format staged files, check the commit message and run `pnpm verify` before a push.
- Commits are one line in [Conventional Commits](https://www.conventionalcommits.org/) form, in English and imperative: `fix(api): reject an unsigned webhook`.
- CI must be green.

## Evals

The eval suite calls a paid model. It runs only when the maintainer dispatches the `Eval` workflow by hand; pull requests never run it.
