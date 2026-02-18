# Contributing to GateFlow

Thank you for your interest in contributing to GateFlow! This guide will help you get started.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) v1.1+ (runtime & package manager)
- [Node.js](https://nodejs.org/) v20+ (for some tooling)
- [Docker](https://www.docker.com/) (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli) v2.45+

### Getting Started

```bash
# Clone the repository
git clone https://github.com/pavvel11/gateflow.git
cd gateflow

# Start local Supabase
npx supabase start

# Install dependencies
cd admin-panel
bun install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your local Supabase keys (shown by `supabase start`)

# Run development server
bun dev

# Run tests
bun test
```

### Project Structure

```
gateflow/
  admin-panel/     # Next.js application (main codebase)
  mcp-server/      # MCP server for AI integrations
  supabase/        # Database migrations and seed data
  scripts/         # Utility scripts
  bruno/           # API collection (Bruno client)
  templates/       # HTML templates for content protection
```

## Making Changes

### Branch Naming

- `feature/description` — new features
- `fix/description` — bug fixes
- `refactor/description` — code improvements

### Commit Messages

Write concise commit messages that explain **why**, not just what:

```
feat: add currency filtering for BLIK payment method
fix: filter out pending transactions from My Purchases page
refactor: remove unused link_display_mode config
```

### Code Style

- TypeScript strict mode
- Follow existing patterns in the codebase
- No unnecessary abstractions — keep it simple
- Tests for new features and bug fixes

### Running Tests

```bash
# Unit tests
cd admin-panel && bun test

# E2E tests (requires running dev server)
bun run test:e2e

# Type checking
bun run typecheck

# Build verification
bun run build
```

## Pull Request Process

1. Create a branch from `dev`
2. Make your changes with tests
3. Ensure `bun run build` passes cleanly
4. Ensure `bun test` passes
5. Open a PR against `dev` with a clear description
6. Wait for review

### PR Description Template

```markdown
## Summary
Brief description of the change.

## Test Plan
How to verify this works.
```

## Releases & Versioning

We use [release-please](https://github.com/googleapis/release-please) for automated versioning. You don't need to manually bump versions or create tags.

### How it works

1. Commits land on `main` (via merged PRs)
2. release-please automatically creates/updates a **Release PR** with a changelog and version bump
3. When the Release PR is merged → tag, GitHub Release, and build artifact are created automatically

### Commit message conventions

Version bumps are determined by [Conventional Commits](https://www.conventionalcommits.org/) prefixes:

| Prefix | Version bump | Example |
|---|---|---|
| `fix:` | patch (1.0.1 → 1.0.2) | `fix: prevent stale session after DB reset` |
| `feat:` | minor (1.0.1 → 1.1.0) | `feat: add variant group support` |
| `feat!:` | major (1.0.1 → 2.0.0) | `feat!: redesign checkout API` |
| `chore:`, `docs:`, `ci:`, `refactor:` | no release | `chore: update dependencies` |

### Manual release (emergency)

Use the `workflow_dispatch` trigger on the **Build & Release** workflow in GitHub Actions.

## Reporting Issues

Use [GitHub Issues](https://github.com/pavvel11/gateflow/issues) to report bugs or request features. Include:

- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment details (OS, browser, Node version)

## Security

For security vulnerabilities, please use [GitHub Security Advisories](https://github.com/pavvel11/gateflow/security/advisories/new) instead of public issues. See [SECURITY.md](./SECURITY.md) for details.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
