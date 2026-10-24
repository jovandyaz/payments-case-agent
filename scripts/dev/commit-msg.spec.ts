import { describe, expect, it } from 'vitest';

import { commitMessageProblem } from './commit-msg.ts';

describe('commitMessageProblem', () => {
  it.each([
    'feat: add the eval workflow',
    'fix(api): reject an unsigned webhook',
    'refactor!: rename the run record',
    'docs: add ADRs\n',
    'ci: pin actions\n# Please enter the commit message\n# Lines starting with # are ignored',
    'test: cover masking\n\n# ------------------------ >8 ------------------------\ndiff --git a/x b/x',
  ])('accepts %j', (message) =>
    expect(commitMessageProblem(message)).toBeNull(),
  );

  it.each([
    ['Add stuff', /Conventional Commits/],
    ['feat:no space', /Conventional Commits/],
    ['feature: add x', /Conventional Commits/],
    ['', /empty/],
    ['feat: add x\n\nbecause y', /one line/],
    ['feat: add x\n\nCo-authored-by: someone <a@b.c>', /one line/],
  ])('rejects %j', (message, reason) =>
    expect(commitMessageProblem(message)).toMatch(reason),
  );
});
