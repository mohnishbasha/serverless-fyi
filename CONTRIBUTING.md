# Contributing

Thanks for helping out. The specs in `docs/` are the source of truth. If you change behavior, update the relevant spec doc in the same PR (CI's `spec-touch` check enforces this).

## Setup

```bash
corepack enable && pnpm install   # installs lefthook git hooks via `prepare`
```

## Branches and commits

- Branch names: `feat/<scope>-<desc>`, `fix/…`, `content/<slug>`, `chore/…`, `docs/…`, `migration/…`. One concern per branch.
- Use [Conventional Commits](https://www.conventionalcommits.org): `<type>(<scope>): <subject>`.
  - Types: `feat fix content docs style refactor perf test build ci chore revert`.
  - Scopes: `seo aeo layout post feeds migration newsletter search deps a11y`.
- Every change lands via a PR, squash-merged, with the PR title as the commit subject. Never push to `main` and never force-push. Agents open draft PRs and never merge their own.

## Tests (TDD)

Write the failing test first, see it fail, implement, see it pass, then refactor.

| Changed                          | Run                                            |
| -------------------------------- | ---------------------------------------------- |
| `src/lib`, `migration/`, scripts | `pnpm test:unit`                               |
| components, layouts, pages, CSS  | `pnpm build && pnpm validate && pnpm test:e2e` |
| posts                            | `pnpm build && pnpm validate`                  |
| before every PR                  | `pnpm check`                                   |

Migration behavior uses golden tests: add `migration/fixtures/NN-name.html` and `NN-name.expected.md`.

### Visual snapshots

Snapshots are rendered on Linux, so they skip on macOS and Windows. If a UI change is intentional, either:

- run `bash scripts/update-snapshots.sh` (needs Docker) after `pnpm build`, and commit the PNGs; or
- add the `update-snapshots` label to the PR and download the `updated-snapshots` artifact from the e2e job.

Say in the PR why the snapshots changed.

### Responsive checklist

Every template must work from 320px to 1440px+. Before a UI PR, check 320, 375, 768 and 1280px in light and dark: no horizontal overflow, no fixed widths, and standalone links and controls at least 44px tall (use `.more-link` / `.link-list`). See [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md) and ADR-029.

## Writing a post

Follow [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md) and the 5 steps in the [README](README.md#publish-a-post-in-5-steps). Never change a published post's slug. Never remove entries from `migration/legacy-urls.json`.

## PR checklist

The checklist lives in [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md): tests, `pnpm check`, spec update, CHANGELOG, screenshots for UI changes, post metadata, and no secrets.

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately as described in [SECURITY.md](SECURITY.md).
