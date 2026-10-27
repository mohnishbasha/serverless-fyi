---
description: Diagnose and fix a failing CI run
argument-hint: '[run id]'
---

Fix CI. Run id (optional): $ARGUMENTS

1. Run `gh run list --limit 5` and pick the failing run (or use the given id).
2. Run `gh run view <id> --log-failed` and read the failure before changing code.
3. Reproduce locally with the matching command (`pnpm check`, `pnpm test:e2e`, ...).
4. Write a failing test that captures the bug, when applicable.
5. Fix the cause, not the symptom; rerun `pnpm check`.
6. Commit (Conventional) and push the branch; never push to main. Visual diffs: see the run-tests skill.
