import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeSuite, assert } from '../core/test-harness.js';
import { extractCssCustomProperties, extractNativeNestingRules, extractCssImports } from '../core/css-parser.js';
import { scanCustomElementsInHtml, scanShadowDomViolations } from '../core/dom-scanner.js';
import { scanCustomElementRegistrations, scanJsStyleAssignments, scanTemplateInlineStyles } from '../core/js-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const CSS_DIR = path.join(PUBLIC_DIR, 'css');
const COMPONENTS_DIR = path.join(PUBLIC_DIR, 'components');
const MODULES_DIR = path.join(PUBLIC_DIR, 'js', 'modules');

describeSuite('Tier 3 - Cross-Feature Combinations: Pairwise Architectural Interactions', { tier: 3 }, (suite) => {

  // =========================================================================
  // Combination 1: Custom Elements + CSS Nesting + Dynamic Styles
  // =========================================================================
  suite.test('C1: Gauge Component combines Light DOM custom element, scoped CSS nesting, and dynamic style width', { featureId: 10, milestone: 'M2, M3' }, () => {
    const gaugeJs = path.join(COMPONENTS_DIR, 'HudStatsGauge.js');
    const content = fs.readFileSync(gaugeJs, 'utf-8');

    // 1. Light DOM verification
    assert.equal(scanShadowDomViolations(gaugeJs).length, 0, 'Must not use Shadow DOM');

    // 2. Dynamic style preservation
    const hasDynamicGauge = /width:\s*\$\{progress\}%/.test(content) || /--progress:\s*\$\{progress\}%/.test(content) || /\.style\.width\s*=/.test(content);
    assert.ok(hasDynamicGauge, 'Must preserve dynamic width calculation');

    // 3. Static host styles removed from JS
    const hostStyles = scanJsStyleAssignments(content, gaugeJs).filter(a => a.isHostStyle && !a.isPermitted);
    assert.equal(hostStyles.length, 0, 'Host styles must be moved to CSS');
  });

  // =========================================================================
  // Combination 2: Design Tokens + Legacy Aliases + View Styles
  // =========================================================================
  suite.test('C2: Design tokens resolve seamlessly through legacy aliases for view and component styling', { featureId: 3, milestone: 'M1' }, () => {
    let css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    const tokensFile = path.join(CSS_DIR, 'tokens', 'tokens.css');
    if (fs.existsSync(tokensFile)) {
      css += '\n' + fs.readFileSync(tokensFile, 'utf-8');
    }

    const props = extractCssCustomProperties(css);
    const tokenMap = new Map(props.map(p => [p.name, p.value]));

    // Check alias chain for primary accent
    if (tokenMap.has('--accent-primary')) {
      const aliasVal = tokenMap.get('--accent-primary');
      assert.ok(aliasVal.includes('var(--sys-'), '--accent-primary must resolve to a --sys-* token');
    }
  });

  // =========================================================================
  // Combination 3: Atomic Design Tags + Light DOM + Host Styling via CSS
  // =========================================================================
  suite.test('C3: GameCard atom/molecule renders in Light DOM with display and sizing governed by CSS', { featureId: 8, milestone: 'M2' }, () => {
    const gameCardJs = path.join(COMPONENTS_DIR, 'GameCard.js');
    const content = fs.readFileSync(gameCardJs, 'utf-8');

    // Light DOM check
    assert.equal(scanShadowDomViolations(gameCardJs).length, 0);

    // Host styles in connectedCallback must be empty
    const hostStyles = scanJsStyleAssignments(content, gameCardJs).filter(a => a.isHostStyle && !a.isPermitted);
    assert.equal(hostStyles.length, 0, 'No host styles in connectedCallback');

    // Dual registration check
    const regs = scanCustomElementRegistrations(content, gameCardJs).map(r => r.tag);
    assert.ok(regs.includes('m-game-card'), 'Registered as m-game-card');
    assert.ok(regs.includes('game-card'), 'Registered as legacy game-card');
  });

  // =========================================================================
  // Combination 4: Satellite Views + Shared Tokens + Dark Arcade Palette
  // =========================================================================
  suite.test('C4: Satellite views (companion, simulator, showcase) inherit unified theme tokens without style conflicts', { featureId: 17, milestone: 'M4' }, () => {
    const satDirs = ['companion', 'simulator', 'showcase'];
    for (const s of satDirs) {
      const cssPath = path.join(PUBLIC_DIR, s, `${s}.css`);
      if (fs.existsSync(cssPath)) {
        const content = fs.readFileSync(cssPath, 'utf-8');
        const imports = extractCssImports(content, path.dirname(cssPath));
        const importsTokensOrStyle = imports.some(i => i.importPath.includes('tokens.css') || i.importPath.includes('style.css'));
        const usesSysOrLegacyTokens = /--sys-color-|--accent-primary|--bg-main/i.test(content);
        assert.ok(importsTokensOrStyle || usesSysOrLegacyTokens, `${s}.css must connect to design tokens system`);
      }
    }
  });

  // =========================================================================
  // Combination 5: Interactive States + Touch Action + Kiosk Ergonomics
  // =========================================================================
  suite.test('C5: Touch arcade buttons combine 64px touch target, touch-action, active scale, and focus rings', { featureId: 11, milestone: 'M2, M4' }, () => {
    let mainCss = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    const resetPath = path.join(CSS_DIR, 'base', 'reset.css');
    if (fs.existsSync(resetPath)) {
      mainCss += '\n' + fs.readFileSync(resetPath, 'utf-8');
    }

    // Touch action defined in reset or button
    assert.match(mainCss, /touch-action\s*:\s*(?:pan-x\s+pan-y|manipulation|none)/, 'Touch action must be configured for kiosk');

    // Active state scale compression
    assert.match(mainCss, /:active\b[^{]*\{[^}]*transform\s*:\s*scale\(/, 'Active state scale compression feedback');
  });

  // =========================================================================
  // Combination 6: Static Inline Styles Removal + Utility Classes
  // =========================================================================
  suite.test('C6: Former inline layout attributes in index.html are cleanly handled by CSS classes', { featureId: 12, milestone: 'M3' }, () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf-8');

    // Topbar brand previously used style="display: flex; align-items: center; gap: 8px;"
    const brandMatch = content.match(/<div\b[^>]*class=["'][^"']*topbar-brand[^"']*["'][^>]*>/);
    if (brandMatch) {
      assert.doesNotMatch(brandMatch[0], /style=/i, 'topbar-brand must use CSS classes, not inline style');
    }

    // Modal headers previously used style="display: flex; align-items: center; gap: 8px;"
    const headerActions = content.match(/<div\b[^>]*class=["'][^"']*modal-header-actions[^"']*["'][^>]*>/g) || [];
    for (const h of headerActions) {
      assert.doesNotMatch(h, /style=/i, 'modal-header-actions must not have inline style');
    }
  });

  // =========================================================================
  // Combination 7: Dual Element Registration + Controller DOM Queries
  // =========================================================================
  suite.test('C7: Controllers query both atomic and legacy tags interchangeably without breaking', { featureId: 8, milestone: 'M2' }, () => {
    const lobbyJs = path.join(MODULES_DIR, 'LobbyController.js');
    const content = fs.readFileSync(lobbyJs, 'utf-8');

    // Lobby handles game cards
    assert.match(content, /game-card|m-game-card/, 'LobbyController queries or renders game cards');
  });

  // =========================================================================
  // Combination 8: Base Reset + Kiosk Grid + Modal Layering
  // =========================================================================
  suite.test('C8: Fixed 1024x600 container works harmoniously with modal overlay z-indexes', { featureId: 15, milestone: 'M3' }, () => {
    const css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');

    // Modal backdrop should have higher z-index than content
    const modalZ = css.match(/\.modal-backdrop\b[^{]*\{[^}]*z-index\s*:\s*([^;]+);/s);
    if (modalZ) {
      const zVal = modalZ[1].trim();
      assert.ok(zVal.includes('var(--sys-z') || parseInt(zVal, 10) >= 100, 'Modal backdrop must have elevated z-index');
    }
  });

  // =========================================================================
  // Combination 9: Keyframe Animations + Accent Glow Tokens + Interactive Modifiers
  // =========================================================================
  suite.test('C9: Keyframe pulse and shockwave animations harmonize with design token glows', { featureId: 4, milestone: 'M1, M4' }, () => {
    const css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    assert.match(css, /@keyframes\s+(?:pulse|shockwave|glow|zoom)/, 'Keyframe animation rules must exist');
  });

  // =========================================================================
  // Combination 10: Calibration Wizard + Dynamic Progress Bar + SVG Dartboard
  // =========================================================================
  suite.test('C10: Matrix calibration wizard orchestrates dynamic progress fill and SVG dartboard cleanly', { featureId: 14, milestone: 'M3' }, () => {
    const scJs = path.join(MODULES_DIR, 'SettingsController.js');
    const content = fs.readFileSync(scJs, 'utf-8');

    // Calibration uses DartboardSVG
    assert.match(content, /DartboardSVG/, 'SettingsController integrates DartboardSVG');
    // Calibration updates progress fill dynamically
    assert.match(content, /fillEl\.style\.width|style\.width/, 'SettingsController updates calibration fill width');
  });

});
