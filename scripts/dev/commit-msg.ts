import { readFileSync } from 'node:fs';

import { EXIT } from './config.ts';

const COMMIT_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
] as const;

const SUBJECT = new RegExp(
  `^((fixup|squash|amend)! )*(${COMMIT_TYPES.join('|')})(\\([a-z0-9-]+\\))?!?: \\S`,
);
const VERBOSE_DIFF_SCISSORS =
  '# ------------------------ >8 ------------------------';

/** Why a commit message breaks the one-line Conventional Commits rule, or null when it does not. */
export function commitMessageProblem(message: string): string | null {
  const lines = message
    .split(VERBOSE_DIFF_SCISSORS)[0]!
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.trimEnd());
  const [subject = '', ...rest] = lines.filter((line) => line !== '');
  if (subject === '') return 'The commit message is empty.';
  if (!SUBJECT.test(subject)) {
    return `"${subject}" is not Conventional Commits: <type>[(scope)][!]: <text>, type one of ${COMMIT_TYPES.join(', ')}.`;
  }
  if (rest.length > 0)
    return 'A commit message is one line: no body, no trailers.';
  return null;
}

if (process.argv[1] === import.meta.filename) {
  const [file] = process.argv.slice(2);
  if (file === undefined) {
    console.error('Usage: node scripts/dev/commit-msg.ts <message-file>');
    process.exitCode = EXIT.usage;
  } else {
    const problem = commitMessageProblem(readFileSync(file, 'utf8'));
    if (problem !== null) console.error(problem);
    process.exitCode = problem === null ? EXIT.ok : EXIT.failed;
  }
}
