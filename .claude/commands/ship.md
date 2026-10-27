---
description: Verify, commit and open a draft PR for the current work
argument-hint: '<conventional commit summary>'
---

Ship the current change. Summary: $ARGUMENTS

1. Ensure you are on a feature branch, never main (`git checkout -b <type>/<topic>` if needed).
2. Run `pnpm check`; stop and fix on failure.
3. Update CHANGELOG and docs/ specs if behavior changed.
4. Commit with a Conventional Commit message.
5. Push the branch (never main, never force).
6. Run `gh pr create --draft --fill`. Do not merge it.
