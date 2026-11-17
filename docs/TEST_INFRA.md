# DartOTron E2E Test Suite Infrastructure & Architecture

## 1. Overview & Objective
The DartOTron E2E Test Suite provides comprehensive, requirement-driven, opaque-box verification for the modular CSS and Web Components refactoring across Requirements R1, R2, R3, R4, and all 18 features defined in `PROJECT.md § Feature Inventory`.

The test suite runs with native Node.js (v20+ / v24) standard library modules (`node:test`, `node:assert/strict`, `node:fs`, `node:path`, `node:http`) without requiring any third-party npm dependencies or build tools.

---

## 2. Test Architecture & Directory Layout

```
test/
├── test-games.js                    # Legacy game logic tests
└── e2e/
    ├── runner.js                    # CLI test runner entrypoint & visual dashboard
    ├── core/
    │   ├── test-harness.js          # Suite registration, assertion engine & metadata mapper
    │   ├── dom-scanner.js           # HTML/DOM scanner for inline styles, tags & Light DOM
    │   ├── css-parser.js            # CSS parser, syntax validator, tokens extractor & nesting scanner
    │   ├── js-scanner.js            # JS template literal & host style assignment analyzer
    │   └── server-fixture.js        # Ephemeral in-process DartOTron HTTP server for asset verification
    ├── tier1-features/              # Tier 1: Isolated Feature Verification (>=5 tests per feature)
    │   ├── test-f01-f05-css-tokens.js      # Features 1-5 (CSS Arch, Tokens, Aliases, Base, Imports) [25 tests]
    │   ├── test-f06-f11-web-components.js  # Features 6-11 (Light DOM, Taxonomy, Dual Reg, Host, Nesting, States) [30 tests]
    │   ├── test-f12-f15-inline-layout.js   # Features 12-15 (HTML/JS Inline Styles, Dynamic, Layouts) [20 tests]
    │   └── test-f16-f18-visual-sat.js      # Features 16-18 (CyberHUD, Satellites, E2E Suite) [15 tests]
    ├── tier2-boundaries/            # Tier 2: Boundary, Edge & Corner Cases (>=5 tests per feature group)
    │   ├── test-b01-token-boundaries.js    # Tokens syntax, edge names, malformed hex, invalid vars [15 tests]
    │   ├── test-b02-dom-boundaries.js      # Light DOM evasion, tag boundaries, attribute presence [15 tests]
    │   ├── test-b03-css-nesting-boundaries.js # Nesting edge cases, pseudo-classes, depth limits [15 tests]
    │   └── test-b04-inline-boundaries.js   # Multiline styles, dynamic clamps, modal backdrops [15 tests]
    ├── tier3-combinations/          # Tier 3: Pairwise Cross-Feature Interactions
    │   └── test-cross-features.js          # 10 cross-feature combination test suites [10 tests]
    └── tier4-scenarios/             # Tier 4: Real-World End-to-End Application Scenarios
        ├── test-scenario-kiosk-shell.js    # Scenario 1: Kiosk arcade startup & shell navigation [6 tests]
        ├── test-scenario-game-lobby.js     # Scenario 2: Game selection & player setup flow [5 tests]
        ├── test-scenario-live-match.js     # Scenario 3: Live match & scoreboards (X01 & Cricket) [5 tests]
        ├── test-scenario-settings-calib.js # Scenario 4: Settings & calibration wizard [5 tests]
        └── test-scenario-satellites.js     # Scenario 5: Satellite screens (Companion, Simulator, Showcase) [6 tests]
```

---

## 3. The 4-Tier Test Methodology

| Tier | Focus | Requirement | Test Count |
|---|---|---|---|
| **Tier 1** | **Feature Coverage** | >=5 test cases per feature for isolated verification across all 18 features | 90 tests |
| **Tier 2** | **Boundary & Corner Cases** | Edge inputs, malformed syntax, empty attributes, clamp limits, evasion attempts | 60 tests |
| **Tier 3** | **Cross-Feature Combinations** | Pairwise interactions between tokens, components, nesting, dynamic styles, and views | 10 tests |
| **Tier 4** | **Real-World Application Scenarios** | Full application flows: Kiosk Shell, Game Lobby, Live Match, Settings & Satellites | 27 tests |
| **Total** | | | **187 tests** |

---

## 4. Feature Inventory & Coverage Mapping

| # | Feature Name | Milestone | Scope / Source | Tier 1 Tests | Tier 2-4 Tests |
|---|---|---|---|---|---|
| 1 | Standard CSS Architecture | M1 | `public/css/` | 5 | 6 |
| 2 | Design Tokens Specification | M1 | `public/css/tokens/tokens.css` | 5 | 14 |
| 3 | Backward Compatibility Aliases | M1 | `tokens.css` / `style.css` | 5 | 2 |
| 4 | Base Foundation Stylesheets | M1 | `public/css/base/` | 5 | 2 |
| 5 | Root `@import` Orchestration | M1 | `public/css/style.css` | 5 | 1 |
| 6 | Light DOM Compliance | M2 | `public/components/` | 5 | 6 |
| 7 | Atomic Design Tag Taxonomy | M2 | `public/components/` | 5 | 12 |
| 8 | Dual Custom Element Registration | M2 | `public/components/` | 5 | 4 |
| 9 | Component Host Style Cleanup | M2 | `public/components/*.js` | 5 | 1 |
| 10 | Component Scoped CSS Nesting | M2 | `public/css/components/` | 5 | 8 |
| 11 | Component States & Modifiers | M2 | `style.css` / components | 5 | 2 |
| 12 | HTML Static Inline Styles Removal | M3 | `public/index.html` | 5 | 10 |
| 13 | JS Static Inline Styles Removal | M3 | `public/js/modules/*.js` | 5 | 7 |
| 14 | Dynamic Runtime Style Preservation | M3 | `HudStatsGauge`, `app.js` | 5 | 7 |
| 15 | Modular Layout & Views CSS | M3 | `public/css/layout/`, `views/` | 5 | 6 |
| 16 | CyberHUD Visual Modernization | M4 | Visual styling & glows | 5 | 0 |
| 17 | Satellite Application Integration | M4 | `companion`, `simulator`, `showcase` | 5 | 6 |
| 18 | E2E Testing Suite & Hardening | M5 | `test/e2e/runner.js` | 5 | 3 |

---

## 5. Verification Rules & Contracts

### 5.1 Inline Styles Policy (Requirement R3)
1. **Static Inline Styles Prohibition**: Zero `style="..."` attributes permitted in HTML files (`public/index.html`, `public/companion/index.html`, etc.) or component render templates in JS.
2. **Permitted Dynamic Runtime Styles**:
   - `HudStatsGauge.js`: `<div class="hud-gauge-fill" style="width: ${progress}%"></div>` (or `--progress: ${progress}%`).
   - `app.js`: `bar.style.transition = 'none'`, `bar.style.width = '100%'`, `bar.style.transition = \`width \${dur}ms linear\``, `bar.style.width = '0%'`, `txt.style.color = color || ''`.
   - `SettingsController.js`: `fillEl.style.width = \`\${pct}%\``.
3. **Host Styles Prohibition**: No static `this.style.display`, `this.style.width`, or `this.style.position` in `connectedCallback()`.

### 5.2 Design Tokens Policy (Requirement R1)
1. Must strictly match naming regex: `/^--sys-[a-z0-9]+-[a-z0-9-]+$/`.
2. Must define complete scales for:
   - Colors: `--sys-color-background-void`, `--sys-color-background`, `--sys-color-surface-*`, `--sys-color-primary`, `--sys-color-neon-*`, `--sys-color-cyan-*`, `--sys-color-amber-*`, `--sys-color-crimson-*`, `--sys-color-text-*`.
   - Spacing: `--sys-spacing-xs`, `--sys-spacing-sm`, `--sys-spacing-md`, `--sys-spacing-lg`, `--sys-spacing-xl`.
   - Radii: `--sys-radius-sm`, `--sys-radius-md`, `--sys-radius-lg`, `--sys-radius-full`.
   - Elevation/Shadow: `--sys-shadow-neon-*`, `--sys-shadow-elevated`.
   - Z-Index: `--sys-z-base`, `--sys-z-overlay`, `--sys-z-modal`, `--sys-z-toast`.
3. Legacy backward-compatibility aliases must map to `--sys-*` variables (e.g. `--accent-primary: var(--sys-color-primary);`).

### 5.3 Web Components & Atomic Design Policy (Requirement R2)
1. Exclusively Light DOM: exactly 0 calls to `attachShadow` or property access to `shadowRoot`.
2. Atomic prefix taxonomy:
   - Atoms: `<a-*>` (e.g. `<a-player-name>`, `<a-button>`, `<a-badge>`, `<a-input>`).
   - Molecules: `<m-*>` (e.g. `<m-game-card>`, `<m-player-select-card>`, `<m-stepper>`, `<m-boolean-card>`, `<m-notification>`, `<m-player-dropdown>`, `<m-stats-*>`, `<m-record-card>`).
   - Organisms: `<o-*>` (e.g. `<o-scoreboard-x01>`, `<o-scoreboard-cricket>`, `<o-virtual-keyboard>`, `<o-stats-column>`).
   - Templates: `<t-*>` (e.g. `<t-lobby>`, `<t-game>`, `<t-finished>`).
3. Dual registration:
   - All refactored custom elements are registered with both Atomic name and legacy name:
     `customElements.define('m-game-card', GameCard);`
     `customElements.define('game-card', GameCard);`
4. Scoped CSS with native nesting:
   - Component styles encapsulate child classes using the Custom Element tag as parent:
     `m-game-card, game-card { & .card-front { ... } &[selected] { ... } }`

---

## 6. How to Run Tests

### Standard Test Execution
```bash
# Run the entire E2E test suite (187 tests)
node test/e2e/runner.js

# Run in baseline audit mode (returns exit code 0 even if refactoring is in progress)
node test/e2e/runner.js --exit-zero

# Verbose output (displays every test case name and outcome)
node test/e2e/runner.js --verbose
```

### Targeted Execution by Tier, Feature, or Milestone
```bash
# Run only Tier 1 (Isolated Feature Coverage)
node test/e2e/runner.js --tier 1

# Run only Tier 2 (Boundary & Corner Cases)
node test/e2e/runner.js --tier 2

# Run only Tier 3 (Cross-Feature Combinations)
node test/e2e/runner.js --tier 3

# Run only Tier 4 (Real-World Application Scenarios)
node test/e2e/runner.js --tier 4

# Run tests for a specific Milestone (e.g. M1, M2, M3, M4)
node test/e2e/runner.js --milestone M1
node test/e2e/runner.js --milestone M2
node test/e2e/runner.js --milestone M3

# Run tests for a specific Feature ID (1 to 18)
node test/e2e/runner.js --feature 12
```

### JSON Reporting for CI / Tooling
```bash
node test/e2e/runner.js --json
```

---

## 7. Pass / Fail Criteria & Exit Codes
- **Pass (Exit Code 0)**: 100% of selected tests pass without assertions failing or runtime errors.
- **Fail (Exit Code 1)**: Any test fails assertion. The runner prints an executive summary table and an actionable defect escalation list sorted by Milestone (M1, M2, M3, M4).
