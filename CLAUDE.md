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
