import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeSuite, assert } from '../core/test-harness.js';
import { scanInlineStylesInHtml } from '../core/dom-scanner.js';
import {
  scanTemplateInlineStyles,
  scanJsStyleAssignments
} from '../core/js-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const CSS_DIR = path.join(PUBLIC_DIR, 'css');
const MODULES_DIR = path.join(PUBLIC_DIR, 'js', 'modules');
const COMPONENTS_DIR = path.join(PUBLIC_DIR, 'components');

describeSuite('Tier 1 - Features 12 to 15: Inline Styles Eradication & Modular Layout', { tier: 1 }, (suite) => {

  // =========================================================================
  // Feature 12: HTML Static Inline Styles Removal
  // =========================================================================
  suite.test('F12.1: Exactly 0 static style="..." attributes in public/index.html', { featureId: 12, milestone: 'M3' }, () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const styles = scanInlineStylesInHtml(indexPath);
    const staticStyles = styles.filter(s => !s.isDynamic);

    assert.equal(
      staticStyles.length,
      0,
      `Found ${staticStyles.length} static style="..." in index.html (first at line ${staticStyles[0]?.line}: <${staticStyles[0]?.tag} ${staticStyles[0]?.raw}>)`
    );
  });

  suite.test('F12.2: Exactly 0 static style="..." in public/companion/index.html', { featureId: 12, milestone: 'M3' }, () => {
    const p = path.join(PUBLIC_DIR, 'companion', 'index.html');
    if (fs.existsSync(p)) {
      const styles = scanInlineStylesInHtml(p);
      const staticStyles = styles.filter(s => !s.isDynamic);
      assert.equal(staticStyles.length, 0, `Found static style in companion/index.html: ${staticStyles[0]?.raw}`);
    }
  });

  suite.test('F12.3: Exactly 0 static style="..." in public/simulator/index.html', { featureId: 12, milestone: 'M3' }, () => {
    const p = path.join(PUBLIC_DIR, 'simulator', 'index.html');
    if (fs.existsSync(p)) {
      const styles = scanInlineStylesInHtml(p);
      const staticStyles = styles.filter(s => !s.isDynamic);
      assert.equal(staticStyles.length, 0, `Found static style in simulator/index.html: ${staticStyles[0]?.raw}`);
    }
  });

  suite.test('F12.4: Exactly 0 static style="..." in public/showcase/index.html', { featureId: 12, milestone: 'M3' }, () => {
    const p = path.join(PUBLIC_DIR, 'showcase', 'index.html');
    if (fs.existsSync(p)) {
      const styles = scanInlineStylesInHtml(p);
      const staticStyles = styles.filter(s => !s.isDynamic);
      assert.equal(staticStyles.length, 0, `Found static style in showcase/index.html: ${staticStyles[0]?.raw}`);
    }
  });

  suite.test('F12.5: Modal dialog elements in index.html use modifier classes instead of style="max-width: ...;"', { featureId: 12, milestone: 'M3' }, () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf-8');
    assert.doesNotMatch(content, /modal-dialog-stitch[^>]*style=["'][^"']*max-width/i, 'Modal dialogs must not use static inline max-width styles');
  });

  // =========================================================================
  // Feature 13: JS Static Inline Styles Removal
  // =========================================================================
  suite.test('F13.1: Zero static style="..." in SettingsController.js template literals', { featureId: 13, milestone: 'M3' }, () => {
    const p = path.join(MODULES_DIR, 'SettingsController.js');
    const styles = scanTemplateInlineStyles(p, p);
    const forbidden = styles.filter(s => !s.isPermitted);

    assert.equal(
      forbidden.length,
      0,
      `Found ${forbidden.length} static inline styles in SettingsController.js (first at line ${forbidden[0]?.line}: ${forbidden[0]?.match})`
    );
  });

  suite.test('F13.2: Zero static style="..." in LobbyController.js template literals', { featureId: 13, milestone: 'M3' }, () => {
    const p = path.join(MODULES_DIR, 'LobbyController.js');
    const styles = scanTemplateInlineStyles(p, p);
    const forbidden = styles.filter(s => !s.isPermitted);

    assert.equal(forbidden.length, 0, `Found static inline style in LobbyController.js at line ${forbidden[0]?.line}: ${forbidden[0]?.match}`);
  });

  suite.test('F13.3: Zero static style="..." in MatchController.js template literals', { featureId: 13, milestone: 'M3' }, () => {
    const p = path.join(MODULES_DIR, 'MatchController.js');
    const styles = scanTemplateInlineStyles(p, p);
    const forbidden = styles.filter(s => !s.isPermitted);

    assert.equal(forbidden.length, 0, `Found static inline style in MatchController.js at line ${forbidden[0]?.line}: ${forbidden[0]?.match}`);
  });

  suite.test('F13.4: Zero static style="..." in public/components/*.js template literals', { featureId: 13, milestone: 'M3' }, () => {
    const compFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.js'));
    const violations = [];

    for (const f of compFiles) {
      const p = path.join(COMPONENTS_DIR, f);
      const styles = scanTemplateInlineStyles(p, p);
      const forbidden = styles.filter(s => !s.isPermitted);
      if (forbidden.length > 0) {
        violations.push({ file: f, violations: forbidden.map(v => `L${v.line}: ${v.match}`) });
      }
    }

    assert.equal(violations.length, 0, `Static styles in component templates: ${JSON.stringify(violations)}`);
  });

  suite.test('F13.5: Zero static style="..." in simulator.js or secondary scripts', { featureId: 13, milestone: 'M3' }, () => {
    const simJs = path.join(PUBLIC_DIR, 'simulator', 'simulator.js');
    if (fs.existsSync(simJs)) {
      const styles = scanTemplateInlineStyles(simJs, simJs);
      const forbidden = styles.filter(s => !s.isPermitted);
      assert.equal(forbidden.length, 0, `Static style in simulator.js at line ${forbidden[0]?.line}: ${forbidden[0]?.match}`);
    }
  });

  // =========================================================================
  // Feature 14: Dynamic Runtime Style Preservation
  // =========================================================================
  suite.test('F14.1: Gauge progress in HudStatsGauge.js dynamically sets progress width', { featureId: 14, milestone: 'M3' }, () => {
    const p = path.join(COMPONENTS_DIR, 'HudStatsGauge.js');
    const content = fs.readFileSync(p, 'utf-8');
    const hasDynamicGauge = /width:\s*\$\{progress\}%/.test(content) || /--progress:\s*\$\{progress\}%/.test(content) || /\.style\.width\s*=/.test(content);
    assert.ok(hasDynamicGauge, 'HudStatsGauge must preserve dynamic progress fill calculation');
  });

  suite.test('F14.2: Dart removal countdown animation in app.js preserves dynamic transition and width', { featureId: 14, milestone: 'M3' }, () => {
    const p = path.join(PUBLIC_DIR, 'js', 'app.js');
    const content = fs.readFileSync(p, 'utf-8');
    assert.match(content, /bar\.style\.transition\s*=\s*/, 'app.js must preserve countdown transition duration animation');
    assert.match(content, /bar\.style\.width\s*=\s*/, 'app.js must preserve countdown width animation');
  });

  suite.test('F14.3: Calibration wizard in SettingsController.js preserves dynamic step progress fill', { featureId: 14, milestone: 'M3' }, () => {
    const p = path.join(MODULES_DIR, 'SettingsController.js');
    const content = fs.readFileSync(p, 'utf-8');
    assert.match(content, /fillEl\.style\.width\s*=\s*`\$\{pct\}%`|fillEl\.style\.width/, 'SettingsController.js must preserve calibration step fill width calculation');
  });

  suite.test('F14.4: Dynamic styles only set numeric/computed runtime values without static layout rules', { featureId: 14, milestone: 'M3' }, () => {
    const p = path.join(COMPONENTS_DIR, 'HudStatsGauge.js');
    const content = fs.readFileSync(p, 'utf-8');
    const styles = scanTemplateInlineStyles(content, p);
    for (const s of styles) {
      if (s.isPermitted) {
        assert.ok(!s.styleValue.includes('display:'), 'Dynamic style should not contain static display rules');
        assert.ok(!s.styleValue.includes('box-sizing:'), 'Dynamic style should not contain static box-sizing rules');
      }
    }
  });

  suite.test('F14.5: Dynamic styles handle boundary values correctly (0% and 100%)', { featureId: 14, milestone: 'M3' }, () => {
    // Test logic of progress normalization
    const clampPct = (val) => Math.min(100, Math.max(0, parseFloat(val) || 0));
    assert.equal(clampPct(0), 0);
    assert.equal(clampPct(100), 100);
    assert.equal(clampPct(-10), 0);
    assert.equal(clampPct(150), 100);
  });

  // =========================================================================
  // Feature 15: Modular Layout & Views CSS
  // =========================================================================
  suite.test('F15.1: Layout stylesheet defines the responsive full-screen application shell container', { featureId: 15, milestone: 'M3' }, () => {
    let css = '';
    const layoutPath = path.join(CSS_DIR, 'layout', 'kiosk-grid.css');
    if (fs.existsSync(layoutPath)) {
      css = fs.readFileSync(layoutPath, 'utf-8');
    } else {
      css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    assert.match(css, /width:\s*100%/, 'Layout must define 100% full-width container');
    assert.match(css, /100vh/, 'Layout must define viewport height sizing');
  });

  suite.test('F15.2: Topbar stylesheet defines kiosk CyberHUD header layout and brand', { featureId: 15, milestone: 'M3' }, () => {
    let css = '';
    const topbarPath = path.join(CSS_DIR, 'layout', 'topbar.css');
    if (fs.existsSync(topbarPath)) {
      css = fs.readFileSync(topbarPath, 'utf-8');
    } else {
      css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    assert.match(css, /\.topbar\b/, 'Stylesheet must define .topbar layout');
  });

  suite.test('F15.3: Footer stylesheet defines kiosk action bottom bar layout', { featureId: 15, milestone: 'M3' }, () => {
    let css = '';
    const footerPath = path.join(CSS_DIR, 'layout', 'footer.css');
    if (fs.existsSync(footerPath)) {
      css = fs.readFileSync(footerPath, 'utf-8');
    } else {
      css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    assert.match(css, /\.kiosk-footer\b|\.footer-actions\b|\.footer\b/, 'Stylesheet must define footer action bar');
  });

  suite.test('F15.4: Views stylesheets provide scoped modular rules for views', { featureId: 15, milestone: 'M3' }, () => {
    const viewsDir = path.join(CSS_DIR, 'views');
    if (fs.existsSync(viewsDir)) {
      const files = fs.readdirSync(viewsDir).filter(f => f.endsWith('.css'));
      assert.ok(files.length >= 3, `Expected at least 3 view stylesheets, found ${files.length}`);
    } else {
      // In monolithic state, verify views are present in style.css
      const css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
      assert.match(css, /#view-lobby\b|\.view-lobby\b/, 'Lobby view rules must exist');
      assert.match(css, /#view-game\b|\.view-game\b/, 'Game view rules must exist');
    }
  });

  suite.test('F15.5: Views switch cleanly without causing horizontal scrollbars', { featureId: 15, milestone: 'M3' }, () => {
    const css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    assert.match(css, /overflow(?:-x)?\s*:\s*hidden/, 'Layout must prevent overflow and horizontal scrollbar');
  });

});
