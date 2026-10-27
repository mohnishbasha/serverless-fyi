import { describe, expect, it } from 'vitest';
import config from '../../commitlint.config.js';

const ignored = (msg: string) => (config.ignores ?? []).some((f: (m: string) => boolean) => f(msg));

describe('commitlint ignores', () => {
  it('ignores GitHub code-scanning autofix commits (PRs are squash-merged under a linted title)', () => {
    expect(
      ignored(
        "Potential fix for pull request finding 'CodeQL / Missing regular expression anchor'\n\nCo-authored-by: Copilot Autofix powered by AI <62310815+github-advanced-security[bot]@users.noreply.github.com>",
      ),
    ).toBe(true);
  });
  it('still lints normal human commits', () => {
    expect(ignored('fixed stuff')).toBe(false);
    expect(ignored('feat: add thing')).toBe(false);
  });
});
