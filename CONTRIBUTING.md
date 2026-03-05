# Contributing to Medusa POS

Thank you for your interest in contributing to Medusa POS! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `yarn install`
4. Start the dev environment: `yarn tauri dev`

### Prerequisites

- Node.js 18+
- Rust (stable)
- yarn
- Platform-specific Tauri prerequisites ([see guide](https://tauri.app/start/prerequisites/))

## Development Workflow

1. Create a branch from `develop` for your changes
2. Make your changes following the code conventions below
3. Run `yarn lint` and `yarn typecheck` to verify your changes
4. Commit with a clear, descriptive message
5. Open a pull request targeting the `develop` branch

## Code Conventions

### File and directory structure

- Every component lives in a `kebab-case/` directory containing an `index.tsx`
- Co-located hooks go in a `hooks.ts` file in the same directory
- `index.tsx` uses `export default`; `hooks.ts` uses named exports
- Import component directories with a default import; import hooks with named imports

### Types and schemas

- Infer types from Zod schemas where possible; add them to `src/types/`
- Do not define schemas inline in components -- they belong in `src/utils/schemas/`

### HTTP and storage

- Never use `fetch` directly -- all requests must go through the patched Medusa SDK
- Never call Tauri Store directly -- use the typed wrapper in `src/utils/storage/`
- Never access `localStorage` directly -- the storage wrapper handles fallback behavior

### Styling

- Use CSS variables (`primary`, `secondary`) -- never hardcode color values
- Tailwind CSS 4 syntax only

## Branch Strategy

| Branch / pattern | Purpose |
| --- | --- |
| `develop` | Integration branch, default PR target |
| `staging` | Triggers a staging build and deployment |
| `release-*` tags | Trigger production builds |

## Pull Requests

- Keep PRs focused on a single change
- Include a clear description of what changed and why
- Ensure linting and type checks pass
- Link any related issues

## Reporting Bugs

Open a [GitHub Issue](https://github.com/narisolutions/medusa-pos/issues) with:

- Steps to reproduce
- Expected vs actual behavior
- OS and app version
- Screenshots if applicable

## Feature Requests

Open a [GitHub Discussion](https://github.com/narisolutions/medusa-pos/discussions) in the Ideas category to propose new features. This allows community input before implementation begins.

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
