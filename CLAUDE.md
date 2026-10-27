# CLAUDE.md

@AGENTS.md
@SOUL.md

## Claude Code specifics

- Use the slash commands in .claude/commands (/new-post, /migrate, /audit-seo, /ship, /fix-ci).
- Delegate reviews to subagents: seo-aeo-reviewer before any PR touching posts or `<head>`; a11y-reviewer for UI changes; release-manager for releases.
- Skills live in .claude/skills (Claude Code) and .agent/skills (other harnesses) — see SKILLS.md.
- Use plan mode for anything touching > 5 files or the migration scripts.
- After editing, the PostToolUse hook runs Prettier; don't fight it.
- When CI fails, read the failing job log with `gh run view --log-failed` before changing code.
- Keep responses about this repo terse; put long explanations in docs/.

## Current product decisions (2026-10-27)

- Newsletter: **Kit free plan** (`PUBLIC_NEWSLETTER_PROVIDER=kit`), migrate to listmonk + SES before ~10k subscribers (ADR-028). Beehiiv is being decommissioned.
- Design: **serene theme** (ADR-027). Change colors only in `src/styles/tokens.css`, keep AA contrast in light and dark mode, and regenerate snapshots with `bash scripts/update-snapshots.sh`.
- Responsive: every UI change must work from 320 px to 1440 px+, with no horizontal overflow and 44 px tap targets (ADR-029). Use the a11y-reviewer subagent for UI PRs.
