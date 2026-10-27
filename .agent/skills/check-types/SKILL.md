---
name: check-types
description: Diagnose and fix TypeScript or astro check errors. Use when typecheck fails or after changing types, content schemas or components.
---

1. Run `pnpm typecheck` (= `astro check && tsc --noEmit`).
2. If content collection types are stale, run `pnpm exec astro sync` and retry.
3. Common fixes: add missing optional-field handling for frontmatter, narrow `undefined` before use, type props via `interface Props`, fix import paths (`.js` extensions in scripts/), avoid `any`.
4. Do not silence with `@ts-ignore` without a comment explaining why.

Success = `pnpm typecheck` exits 0 with no errors or new warnings.
