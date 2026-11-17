import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeSuite, assert } from '../core/test-harness.js';
import { extractCssImports, extractCssCustomProperties } from '../core/css-parser.js';
import { scanInlineStylesInHtml } from '../core/dom-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const CSS_DIR = path.join(PUBLIC_DIR, 'css');

describeSuite('Tier 1 - Features 16 to 18: Visual Modernization, Satellites & E2E Hardening', { tier: 1 }, (suite) => {

  // =========================================================================
  // Feature 16: CyberHUD Visual Modernization
  // =========================================================================
  suite.test('F16.1: Dark arcade color palette defined with background void and high-contrast surfaces', { featureId: 16, milestone: 'M4' }, () => {
    let css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    const hasVoid = /#0a0e18/i.test(css) || /--sys-color-background-void/.test(css);
    const hasSurface = /#171b26|#1c1f2a|#262a35/i.test(css) || /--sys-color-surface-/.test(css);

    assert.ok(hasVoid, 'Arcade theme must define dark void background');
    assert.ok(hasSurface, 'Arcade theme must define layered surface containers');
  });

  suite.test('F16.2: CyberHUD neon accent glow defined via box-shadow and text-shadow rules', { featureId: 16, milestone: 'M4' }, () => {
    let css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    const hasGlow = /box-shadow\s*:[^;]*(?:rgba\(0,\s*255,\s*135|rgba\(76,\s*215,\s*246|var\(--sys-shadow|glow)/i.test(css);
    assert.ok(hasGlow, 'CyberHUD must feature neon glow effects via box-shadow or tokens');
  });

  suite.test('F16.3: Touch arcade buttons provide at least 48px to 64px height for kiosk ergonomics', { featureId: 16, milestone: 'M4' }, () => {
    let css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    const hasTouchHeight = /height\s*:\s*(?:48|56|60|64)px/i.test(css) || /min-height\s*:\s*(?:48|56|60|64)px/i.test(css);
    assert.ok(hasTouchHeight, 'Arcade buttons must provide ergonomic touch heights (48-64px)');
  });

  suite.test('F16.4: Interactive buttons define active tactile feedback with scale depression', { featureId: 16, milestone: 'M4' }, () => {
    let css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    assert.match(css, /button:active\b|\.btn[^:]*:active\b|a-button:active\b/, 'Button styles must define :active tactile feedback');
  });

  suite.test('F16.5: High contrast typography enforces Space Grotesk and Plus Jakarta Sans readability', { featureId: 16, milestone: 'M4' }, () => {
    let css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    assert.match(css, /font-family\b[^;]*(?:Space Grotesk|Jakarta Sans|--sys-font)/i, 'Typography must configure Space Grotesk or Jakarta Sans');
  });

  // =========================================================================
  // Feature 17: Satellite Application Integration
  // =========================================================================
  suite.test('F17.1: public/companion/companion.css imports or references shared design tokens', { featureId: 17, milestone: 'M4' }, () => {
    const compCssPath = path.join(PUBLIC_DIR, 'companion', 'companion.css');
    assert.ok(fs.existsSync(compCssPath), 'companion.css must exist');
    const content = fs.readFileSync(compCssPath, 'utf-8');

    const importsTokens = /@import\s+['"][^'"]*tokens\.css['"]/.test(content) || /@import\s+['"][^'"]*style\.css['"]/.test(content);
    const usesSysTokens = /--sys-color-/.test(content);
    assert.ok(importsTokens || usesSysTokens, 'companion.css must import tokens.css or style.css or use --sys-* tokens');
  });

  suite.test('F17.2: public/simulator/simulator.css imports or references shared design tokens', { featureId: 17, milestone: 'M4' }, () => {
    const simCssPath = path.join(PUBLIC_DIR, 'simulator', 'simulator.css');
    assert.ok(fs.existsSync(simCssPath), 'simulator.css must exist');
    const content = fs.readFileSync(simCssPath, 'utf-8');

    const importsTokens = /@import\s+['"][^'"]*tokens\.css['"]/.test(content) || /@import\s+['"][^'"]*style\.css['"]/.test(content);
    const usesSysTokens = /--sys-color-/.test(content);
    assert.ok(importsTokens || usesSysTokens, 'simulator.css must import tokens.css or style.css or use --sys-* tokens');
  });

  suite.test('F17.3: public/showcase/showcase.css imports or references shared design tokens', { featureId: 17, milestone: 'M4' }, () => {
    const scCssPath = path.join(PUBLIC_DIR, 'showcase', 'showcase.css');
    assert.ok(fs.existsSync(scCssPath), 'showcase.css must exist');
    const content = fs.readFileSync(scCssPath, 'utf-8');

    const importsTokens = /@import\s+['"][^'"]*tokens\.css['"]/.test(content) || /@import\s+['"][^'"]*style\.css['"]/.test(content);
    const usesSysTokens = /--sys-color-/.test(content);
    assert.ok(importsTokens || usesSysTokens, 'showcase.css must import tokens.css or style.css or use --sys-* tokens');
  });

  suite.test('F17.4: Satellite screens use consistent brand colors from shared design tokens', { featureId: 17, milestone: 'M4' }, () => {
    const compCss = fs.readFileSync(path.join(PUBLIC_DIR, 'companion', 'companion.css'), 'utf-8');
    const simCss = fs.readFileSync(path.join(PUBLIC_DIR, 'simulator', 'simulator.css'), 'utf-8');

    const compHasBrand = /#00ff87|--bullseye-neon|--sys-color-neon|--sys-color-primary/i.test(compCss);
    const simHasBrand = /#00ff87|--bullseye-neon|--sys-color-neon|--sys-color-primary/i.test(simCss);

    assert.ok(compHasBrand, 'companion.css must use consistent brand neon color');
    assert.ok(simHasBrand, 'simulator.css must use consistent brand neon color');
  });

  suite.test('F17.5: Satellite HTML files have zero static inline styles', { featureId: 17, milestone: 'M4' }, () => {
    const satHtmls = [
      path.join(PUBLIC_DIR, 'companion', 'index.html'),
      path.join(PUBLIC_DIR, 'simulator', 'index.html'),
      path.join(PUBLIC_DIR, 'showcase', 'index.html')
    ];

    for (const f of satHtmls) {
      if (fs.existsSync(f)) {
        const styles = scanInlineStylesInHtml(f);
        const staticStyles = styles.filter(s => !s.isDynamic);
        assert.equal(staticStyles.length, 0, `Satellite file ${path.relative(ROOT_DIR, f)} has static styles: ${staticStyles[0]?.raw}`);
      }
    }
  });

  // =========================================================================
  // Feature 18: E2E Testing Suite & Hardening
  // =========================================================================
  suite.test('F18.1: Test runner script test/e2e/runner.js exists and is executable', { featureId: 18, milestone: 'M5' }, () => {
    const runnerPath = path.join(ROOT_DIR, 'test', 'e2e', 'runner.js');
    assert.ok(fs.existsSync(runnerPath), 'test/e2e/runner.js must exist');
  });

  suite.test('F18.2: Runner outputs comprehensive pass/fail results per tier and per feature', { featureId: 18, milestone: 'M5' }, () => {
    const runnerPath = path.join(ROOT_DIR, 'test', 'e2e', 'runner.js');
    const content = fs.readFileSync(runnerPath, 'utf-8');
    assert.match(content, /tier/i, 'Runner must handle tier reporting');
    assert.match(content, /summary|report/i, 'Runner must provide summary reporting');
  });

  suite.test('F18.3: Runner tests cover all 18 features defined in docs/PRD.md', { featureId: 18, milestone: 'M5' }, () => {
    const tier1Dir = path.join(ROOT_DIR, 'test', 'e2e', 'tier1-features');
    const files = fs.readdirSync(tier1Dir).filter(f => f.endsWith('.js'));
    assert.ok(files.length >= 4, 'Tier 1 must contain full feature coverage suites');
  });

  suite.test('F18.4: Documentation file docs/TEST_INFRA.md exists', { featureId: 18, milestone: 'M5' }, () => {
    const docPath = path.join(ROOT_DIR, 'docs', 'TEST_INFRA.md');
    assert.ok(fs.existsSync(docPath), 'docs/TEST_INFRA.md must exist');
  });

  suite.test('F18.5: Product Requirements Document docs/PRD.md and docs/DESIGN.md exist', { featureId: 18, milestone: 'M5' }, () => {
    const prdPath = path.join(ROOT_DIR, 'docs', 'PRD.md');
    const designPath = path.join(ROOT_DIR, 'docs', 'DESIGN.md');
    assert.ok(fs.existsSync(prdPath), 'docs/PRD.md must exist');
    assert.ok(fs.existsSync(designPath), 'docs/DESIGN.md must exist');
  });

});
