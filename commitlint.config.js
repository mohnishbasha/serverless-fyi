export default {
  extends: ['@commitlint/config-conventional'],
  // GitHub code-scanning autofix commits can't be reworded without a force push; PRs are squash-merged
  // under a linted PR title, so these never reach main as-is.
  ignores: [(msg) => /Copilot Autofix|github-advanced-security\[bot\]/.test(msg)],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'content', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case']],
    'header-max-length': [2, 'always', 100],
  },
};
