# Contributing to DartOTron

Thank you for your interest in contributing to **DartOTron**! All contributions — bug fixes, new game rules/variants, hardware documentation, translations, and UI improvements — are warmly welcomed.

---

## Core Architectural Principles

Before writing code, please review [`docs/PRD.md`](docs/PRD.md) (Single Source of Truth) and keep these strict project rules in mind:

1. **Zero npm Dependencies**:
   - DartOTron uses native **Node.js `>= 22.5`** (`node:http`, `node:sqlite`, `node:fs`, `node:test`) and standard browser APIs (ES Modules, W3C Custom Elements, CSS Level 4 Nesting & Design Tokens).
   - **Do not add** runtime or build-time dependencies (`package-lock.json`, `node_modules`, Webpack, Vite, Sass, etc.).
2. **Light DOM & Design Tokens**:
   - Web Components in `public/components/` use **Light DOM** (never `attachShadow`) and share tokens defined in `public/css/tokens/tokens.css` (see [`docs/DESIGN.md`](docs/DESIGN.md)).
   - Avoid inline static `style=""` attributes in HTML templates.
3. **6-Pillar Repository Structure**:
   - `arduino/` — Arduino USB matrix firmware & hardware diagrams
   - `docs/` — Architecture, design, hardware, and test documentation
   - `public/` — Vanilla ES Modules front-end, Web Components, i18n (`fr`, `en`, `nl`, `de`), `/companion`, `/showcase`, `/simulator`
   - `scripts/` — Raspberry Pi deployment, systemd service, kiosk autostart, release updater
   - `server/` — HTTP/WebSocket server, `MatchEngine`, 6 game modules, SQLite V2 repositories
   - `test/` — Unit/integration suite (`test/test-games.js`) and 4-tier E2E suite (`test/e2e/`)

---

## Development Setup

```bash
# 1. Clone your fork
git clone https://github.com/Ldo-fr/DartOTron.git
cd DartOTron

# 2. Verify Node.js version (>= 22.5 required for node:sqlite)
node -v

# 3. Start the server in development watch mode (enables /simulator and /showcase)
npm run dev
```

- Kiosk UI: `http://localhost:8180/`
- Hardware Serial Simulator: `http://localhost:8180/simulator`
- Web Components Showcase: `http://localhost:8180/showcase`
- Mobile Companion UI: `http://localhost:8180/companion`

---

## Running Tests & Syntax Checks

Every Pull Request must pass the full syntax and test suite with zero failures:

```bash
# Check JS syntax across server/ and public/
find server public -name "*.js" -type f -print0 | xargs -0 -n 1 node --check

# Run unit, integration, and 4-tier E2E tests
npm run test:all
```

See [`docs/TEST_INFRA.md`](docs/TEST_INFRA.md) for details on how the test suite is structured.

---

## Commit & Pull Request Conventions

DartOTron enforces **Conventional Commits** on both Pull Request titles (via CI) and commit messages (used to automate versioning and release notes in `.github/workflows/release.yml`):

- `feat(<scope>): ...` — New feature (triggers minor release)
- `fix(<scope>): ...` — Bug fix (triggers patch release)
- `docs(<scope>): ...` — Documentation updates
- `refactor(<scope>): ...` — Code refactoring without behavior change
- `test(<scope>): ...` — Adding or updating tests
- `ci(<scope>): ...` / `chore(<scope>): ...` — CI/CD and maintenance tasks

Common scopes: `engine`, `games`, `ui`, `components`, `css`, `companion`, `showcase`, `simulator`, `db`, `serial`, `kiosk`, `docs`, `ci`.

---

## Submitting a Pull Request

1. Fork the repository and create a branch from `main` (e.g., `feat/cricket-variant` or `fix/serial-debounce`).
2. Keep changes focused and verify `npm run test:all` passes cleanly.
3. Open a Pull Request against `main` using a Conventional Commit title and fill out the PR checklist.

---

## License

By contributing to DartOTron, you agree that your contributions will be licensed under the **GNU General Public License v3.0 (`GPL-3.0`)**. See [LICENSE](LICENSE).
