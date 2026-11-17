import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeSuite, assert } from '../core/test-harness.js';
import {
  validateCssSyntax,
  extractCssCustomProperties,
  extractCssImports,
  stripCssComments
} from '../core/css-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const CSS_DIR = path.join(PUBLIC_DIR, 'css');

describeSuite('Tier 1 - Features 1 to 5: Standard CSS Architecture & Design Tokens', { tier: 1 }, (suite) => {

  // =========================================================================
  // Feature 1: Standard CSS Architecture
  // =========================================================================
  suite.test('F1.1: Verify package.json contains 0 build tools or preprocessor dependencies', { featureId: 1, milestone: 'M1' }, () => {
    const pkgPath = path.join(ROOT_DIR, 'package.json');
    assert.ok(fs.existsSync(pkgPath), 'package.json must exist');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    const forbidden = ['sass', 'less', 'postcss', 'tailwindcss', 'webpack', 'vite', 'gulp', 'rollup', 'esbuild'];
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

    for (const tool of forbidden) {
      assert.ok(!deps[tool], `Forbidden build dependency detected: ${tool}`);
    }
  });

  suite.test('F1.2: Verify CSS files use standard native CSS syntax without SCSS constructs', { featureId: 1, milestone: 'M1' }, () => {
    const cssFiles = [path.join(CSS_DIR, 'style.css')];
    if (fs.existsSync(path.join(CSS_DIR, 'tokens'))) {
      const tokenFiles = fs.readdirSync(path.join(CSS_DIR, 'tokens')).map(f => path.join(CSS_DIR, 'tokens', f));
      cssFiles.push(...tokenFiles);
    }

    for (const file of cssFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');
        const result = validateCssSyntax(content, path.relative(ROOT_DIR, file));
        assert.ok(result.valid, `CSS syntax errors in ${file}: ${result.errors.join('; ')}`);
      }
    }
  });

  suite.test('F1.3: Verify CSS files have valid UTF-8 encoding and clean comment structures', { featureId: 1, milestone: 'M1' }, () => {
    const mainCss = path.join(CSS_DIR, 'style.css');
    assert.ok(fs.existsSync(mainCss), 'style.css must exist');
    const content = fs.readFileSync(mainCss, 'utf-8');
    assert.ok(content.length > 0, 'style.css must not be empty');
    assert.doesNotThrow(() => Buffer.from(content, 'utf-8').toString('utf-8'));
  });

  suite.test('F1.4: Verify CSS files have balanced braces without syntax truncation', { featureId: 1, milestone: 'M1' }, () => {
    const mainCss = path.join(CSS_DIR, 'style.css');
    const content = fs.readFileSync(mainCss, 'utf-8');
    const clean = stripCssComments(content);

    let count = 0;
    for (const ch of clean) {
      if (ch === '{') count++;
      if (ch === '}') count--;
    }
    assert.equal(count, 0, 'CSS must have balanced curly braces { and }');
  });

  suite.test('F1.5: Verify HTML entrypoints link directly to standard CSS stylesheets', { featureId: 1, milestone: 'M1' }, () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    assert.ok(fs.existsSync(indexPath), 'index.html must exist');
    const html = fs.readFileSync(indexPath, 'utf-8');
    assert.match(html, /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*style\.css["']/i, 'index.html must link to style.css');
  });

  // =========================================================================
  // Feature 2: Design Tokens Specification (--sys-[concept]-[variante])
  // =========================================================================
  suite.test('F2.1: Verify design tokens follow strict naming convention --sys-[concept]-[variante]', { featureId: 2, milestone: 'M1' }, () => {
    // Read style.css and tokens.css if it exists
    let css = '';
    const tokensFile = path.join(CSS_DIR, 'tokens', 'tokens.css');
    if (fs.existsSync(tokensFile)) {
      css += fs.readFileSync(tokensFile, 'utf-8') + '\n';
    }
    const styleFile = path.join(CSS_DIR, 'style.css');
    if (fs.existsSync(styleFile)) {
      css += fs.readFileSync(styleFile, 'utf-8');
    }

    const props = extractCssCustomProperties(css);
    const sysTokens = props.filter(p => p.name.startsWith('--sys-'));

    assert.ok(sysTokens.length >= 10, `Expected at least 10 --sys-* design tokens, found ${sysTokens.length}`);
    for (const token of sysTokens) {
      assert.match(token.name, /^--sys-[a-z0-9]+-[a-z0-9-]+$/, `Token name ${token.name} does not match --sys-[concept]-[variante]`);
    }
  });

  suite.test('F2.2: Verify complete surface/canvas color token scale (--sys-color-background*, --sys-color-surface*)', { featureId: 2, milestone: 'M1' }, () => {
    let css = '';
    const tokensFile = path.join(CSS_DIR, 'tokens', 'tokens.css');
    if (fs.existsSync(tokensFile)) {
      css += fs.readFileSync(tokensFile, 'utf-8');
    } else {
      css += fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    const props = extractCssCustomProperties(css);
    const tokenNames = new Set(props.map(p => p.name));

    const requiredSurfaces = [
      '--sys-color-background-void',
      '--sys-color-surface-lowest',
      '--sys-color-surface-container'
    ];

    for (const req of requiredSurfaces) {
      assert.ok(tokenNames.has(req), `Missing required surface design token: ${req}`);
    }
  });

  suite.test('F2.3: Verify CyberHUD accent & neon color token scale (--sys-color-primary, neon, cyan, amber, crimson)', { featureId: 2, milestone: 'M1' }, () => {
    let css = '';
    const tokensFile = path.join(CSS_DIR, 'tokens', 'tokens.css');
    if (fs.existsSync(tokensFile)) {
      css += fs.readFileSync(tokensFile, 'utf-8');
    } else {
      css += fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    const props = extractCssCustomProperties(css);
    const tokenNames = new Set(props.map(p => p.name));

    const accentFamilies = [
      ['--sys-color-primary', '--sys-color-neon'],
      ['--sys-color-secondary', '--sys-color-cyan'],
      ['--sys-color-warning', '--sys-color-amber'],
      ['--sys-color-danger', '--sys-color-crimson']
    ];

    let foundAccents = 0;
    for (const fam of accentFamilies) {
      const matched = [...tokenNames].some(name => fam.some(acc => name === acc || name.startsWith(`${acc}-`)));
      if (matched) foundAccents++;
    }

    assert.ok(foundAccents >= 4, `Expected at least 4 accent tokens among neon/cyan/amber/crimson/primary/secondary/warning/danger, found ${foundAccents}`);
  });

  suite.test('F2.4: Verify spacing and radius token scales (--sys-spacing-*, --sys-radius-*)', { featureId: 2, milestone: 'M1' }, () => {
    let css = '';
    const tokensFile = path.join(CSS_DIR, 'tokens', 'tokens.css');
    if (fs.existsSync(tokensFile)) {
      css += fs.readFileSync(tokensFile, 'utf-8');
    } else {
      css += fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    const props = extractCssCustomProperties(css);
    const tokenNames = new Set(props.map(p => p.name));

    const hasSpacing = [...tokenNames].some(name => name.startsWith('--sys-spacing-') || name.startsWith('--sys-space-'));
    const hasRadius = [...tokenNames].some(name => name.startsWith('--sys-radius-'));

    assert.ok(hasSpacing, 'Expected --sys-spacing-* tokens in design system');
    assert.ok(hasRadius, 'Expected --sys-radius-* tokens in design system');
  });

  suite.test('F2.5: Verify elevation/shadow and z-index token scales (--sys-shadow-*, --sys-z-*)', { featureId: 2, milestone: 'M1' }, () => {
    let css = '';
    const tokensFile = path.join(CSS_DIR, 'tokens', 'tokens.css');
    if (fs.existsSync(tokensFile)) {
      css += fs.readFileSync(tokensFile, 'utf-8');
    } else {
      css += fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    const props = extractCssCustomProperties(css);
    const tokenNames = new Set(props.map(p => p.name));

    const hasShadow = [...tokenNames].some(name => name.startsWith('--sys-shadow-') || name.startsWith('--sys-elevation-'));
    const hasZIndex = [...tokenNames].some(name => name.startsWith('--sys-z-') || name.startsWith('--sys-zindex-'));

    assert.ok(hasShadow, 'Expected --sys-shadow-* or --sys-elevation-* tokens in design system');
    assert.ok(hasZIndex, 'Expected --sys-z-* or --sys-zindex-* tokens in design system');
  });

  // =========================================================================
  // Feature 3: Backward Compatibility Aliases
  // =========================================================================
  suite.test('F3.1: Verify legacy variable --accent-primary maps to a --sys-* token', { featureId: 3, milestone: 'M1' }, () => {
    let css = '';
    const tokensFile = path.join(CSS_DIR, 'tokens', 'tokens.css');
    if (fs.existsSync(tokensFile)) {
      css += fs.readFileSync(tokensFile, 'utf-8');
    } else {
      css += fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    const props = extractCssCustomProperties(css);
    const accentProp = props.find(p => p.name === '--accent-primary');

    assert.ok(accentProp, 'Legacy alias --accent-primary must be defined');
    assert.ok(accentProp.value.includes('var(--sys-'), `--accent-primary must alias a --sys-* token, got: ${accentProp.value}`);
  });

  suite.test('F3.2: Verify legacy variable --bg-main or --surface-lowest maps to --sys-color-*', { featureId: 3, milestone: 'M1' }, () => {
    let css = '';
    const tokensFile = path.join(CSS_DIR, 'tokens', 'tokens.css');
    if (fs.existsSync(tokensFile)) {
      css += fs.readFileSync(tokensFile, 'utf-8');
    } else {
      css += fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    const props = extractCssCustomProperties(css);
    const bgAlias = props.find(p => p.name === '--bg-main' || p.name === '--surface-lowest');

    assert.ok(bgAlias, 'Legacy background alias (--bg-main or --surface-lowest) must be defined');
    assert.ok(bgAlias.value.includes('var(--sys-'), `Background alias must resolve to a --sys-* token, got: ${bgAlias.value}`);
  });

  suite.test('F3.3: Verify legacy brand color variables (--bullseye-neon, --cyber-cyan, etc.) map to --sys-*', { featureId: 3, milestone: 'M1' }, () => {
    let css = '';
    const tokensFile = path.join(CSS_DIR, 'tokens', 'tokens.css');
    if (fs.existsSync(tokensFile)) {
      css += fs.readFileSync(tokensFile, 'utf-8');
    } else {
      css += fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    const props = extractCssCustomProperties(css);
    const legacyBrandProps = props.filter(p => ['--bullseye-neon', '--cyber-cyan', '--tournament-amber', '--laser-crimson'].includes(p.name));

    assert.ok(legacyBrandProps.length >= 2, `Expected legacy brand color aliases, found ${legacyBrandProps.length}`);
    for (const p of legacyBrandProps) {
      assert.ok(p.value.includes('var(--sys-'), `${p.name} must alias a --sys-* token`);
    }
  });

  suite.test('F3.4: Verify legacy font variables (--font-display, --font-mono, --font-body) map to --sys-*', { featureId: 3, milestone: 'M1' }, () => {
    let css = '';
    const tokensFile = path.join(CSS_DIR, 'tokens', 'tokens.css');
    if (fs.existsSync(tokensFile)) {
      css += fs.readFileSync(tokensFile, 'utf-8');
    } else {
      css += fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    const props = extractCssCustomProperties(css);
    const fontAliases = props.filter(p => ['--font-display', '--font-mono', '--font-body'].includes(p.name));

    assert.ok(fontAliases.length >= 2, `Expected legacy font aliases, found ${fontAliases.length}`);
    for (const f of fontAliases) {
      assert.ok(f.value.includes('var(--sys-'), `${f.name} must alias a --sys-* font token`);
    }
  });

  suite.test('F3.5: Verify alias definitions do not contain unclosed or broken var() statements', { featureId: 3, milestone: 'M1' }, () => {
    let css = '';
    const tokensFile = path.join(CSS_DIR, 'tokens', 'tokens.css');
    if (fs.existsSync(tokensFile)) {
      css += fs.readFileSync(tokensFile, 'utf-8');
    } else {
      css += fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    const props = extractCssCustomProperties(css);
    for (const p of props) {
      if (p.value.includes('var(')) {
        const opens = (p.value.match(/var\(/g) || []).length;
        const closes = (p.value.match(/\)/g) || []).length;
        assert.equal(opens, closes, `Mismatched parentheses in var() for ${p.name}: ${p.value}`);
      }
    }
  });

  // =========================================================================
  // Feature 4: Base Foundation Stylesheets
  // =========================================================================
  suite.test('F4.1: Verify modern reset styles (box-sizing: border-box and margin resets)', { featureId: 4, milestone: 'M1' }, () => {
    let css = '';
    const resetFile = path.join(CSS_DIR, 'base', 'reset.css');
    if (fs.existsSync(resetFile)) {
      css = fs.readFileSync(resetFile, 'utf-8');
    } else {
      css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    assert.match(css, /box-sizing\s*:\s*border-box/, 'Reset must configure box-sizing: border-box');
  });

  suite.test('F4.2: Verify touch kiosk optimization in reset (touch-action prevention)', { featureId: 4, milestone: 'M1' }, () => {
    let css = '';
    const resetFile = path.join(CSS_DIR, 'base', 'reset.css');
    if (fs.existsSync(resetFile)) {
      css = fs.readFileSync(resetFile, 'utf-8');
    } else {
      css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    assert.match(css, /touch-action\s*:\s*(?:pan-x\s+pan-y|manipulation|none)/, 'Reset must configure touch-action for touch kiosk responsiveness');
  });

  suite.test('F4.3: Verify typography declarations for Space Grotesk and Plus Jakarta Sans with fallbacks', { featureId: 4, milestone: 'M1' }, () => {
    let css = '';
    const typoFile = path.join(CSS_DIR, 'base', 'typography.css');
    if (fs.existsSync(typoFile)) {
      css = fs.readFileSync(typoFile, 'utf-8');
    } else {
      css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    assert.match(css, /Space Grotesk/i, 'Typography must declare Space Grotesk');
    assert.match(css, /Plus Jakarta Sans/i, 'Typography must declare Plus Jakarta Sans');
  });

  suite.test('F4.4: Verify utility classes (.u-flex, .u-hidden, and text color utilities)', { featureId: 4, milestone: 'M1' }, () => {
    let css = '';
    const utilFile = path.join(CSS_DIR, 'base', 'utilities.css');
    if (fs.existsSync(utilFile)) {
      css = fs.readFileSync(utilFile, 'utf-8');
    } else {
      css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    const hasFlexUtil = /\.u-flex\b/.test(css) || /\.d-flex\b/.test(css);
    const hasHiddenUtil = /\.u-hidden\b/.test(css) || /\.hidden\b/.test(css);
    const hasColorUtil = /\.u-text-neon\b/.test(css) || /\.text-bullseye-neon\b/.test(css) || /\.text-neon\b/.test(css);

    assert.ok(hasFlexUtil, 'Utility stylesheet must declare flex utility classes');
    assert.ok(hasHiddenUtil, 'Utility stylesheet must declare hidden utility class');
    assert.ok(hasColorUtil, 'Utility stylesheet must declare text color utility classes');
  });

  suite.test('F4.5: Verify keyframe animations with hardware-accelerated transforms', { featureId: 4, milestone: 'M1' }, () => {
    let css = '';
    const animFile = path.join(CSS_DIR, 'base', 'animations.css');
    if (fs.existsSync(animFile)) {
      css = fs.readFileSync(animFile, 'utf-8');
    } else {
      css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    assert.match(css, /@keyframes\s+[\w-]+/, 'Base animations must declare keyframe rules');
    assert.match(css, /transform\s*:/, 'Animations should use transform for GPU acceleration');
  });

  // =========================================================================
  // Feature 5: Root @import Orchestration
  // =========================================================================
  suite.test('F5.1: Verify public/css/style.css exists as the root stylesheet', { featureId: 5, milestone: 'M1' }, () => {
    const mainCss = path.join(CSS_DIR, 'style.css');
    assert.ok(fs.existsSync(mainCss), 'public/css/style.css must exist');
  });

  suite.test('F5.2: Verify @import hierarchy adheres to CSS architecture layers (tokens -> base -> layout -> components -> views)', { featureId: 5, milestone: 'M1' }, () => {
    const mainCss = path.join(CSS_DIR, 'style.css');
    const content = fs.readFileSync(mainCss, 'utf-8');
    const imports = extractCssImports(content, CSS_DIR);

    // When refactored into modular architecture, style.css orchestrates imports
    if (imports.length > 0) {
      // Check that tokens is imported before components or views
      const tokensIdx = imports.findIndex(imp => imp.importPath.includes('tokens'));
      const viewsIdx = imports.findIndex(imp => imp.importPath.includes('views'));
      if (tokensIdx !== -1 && viewsIdx !== -1) {
        assert.ok(tokensIdx < viewsIdx, 'Tokens must be imported before views in CSS pyramid');
      }
    } else {
      // In monolithic state, verify token block appears before components
      const tokensPos = content.indexOf('--sys-') !== -1 ? content.indexOf('--sys-') : content.indexOf(':root');
      const gameCardPos = content.indexOf('.game-card');
      assert.ok(tokensPos !== -1 && gameCardPos !== -1 && tokensPos < gameCardPos, 'Token definitions must precede component styles');
    }
  });

  suite.test('F5.3: Verify all local @import target paths resolve to existing files on disk', { featureId: 5, milestone: 'M1' }, () => {
    const mainCss = path.join(CSS_DIR, 'style.css');
    const content = fs.readFileSync(mainCss, 'utf-8');
    const imports = extractCssImports(content, CSS_DIR);

    for (const imp of imports) {
      if (!imp.importPath.startsWith('http')) {
        assert.ok(imp.exists, `@import path does not exist on disk: ${imp.importPath} (resolved: ${imp.resolvedPath})`);
      }
    }
  });

  suite.test('F5.4: Verify all @import statements are placed before rule declarations in style.css', { featureId: 5, milestone: 'M1' }, () => {
    const mainCss = path.join(CSS_DIR, 'style.css');
    const content = fs.readFileSync(mainCss, 'utf-8');
    const clean = stripCssComments(content).trim();

    const importRegex = /@import\s+[^;]+;/g;
    let lastImportEnd = -1;
    let m;
    while ((m = importRegex.exec(clean)) !== null) {
      lastImportEnd = m.index + m[0].length;
    }

    if (lastImportEnd !== -1) {
      const beforeImports = clean.substring(0, lastImportEnd);
      // Remove all @import statements and @charset
      const withoutImports = beforeImports
        .replace(/@charset\s+[^;]+;/g, '')
        .replace(/@import\s+[^;]+;/g, '')
        .trim();
      assert.equal(withoutImports, '', '@import rules must precede all other CSS style rules');
    }
  });

  suite.test('F5.5: Verify no circular dependencies exist among CSS @import statements', { featureId: 5, milestone: 'M1' }, () => {
    const visited = new Set();
    function checkCycle(filePath, chain = []) {
      if (!fs.existsSync(filePath)) return;
      if (chain.includes(filePath)) {
        assert.fail(`Circular @import detected: ${chain.concat(filePath).join(' -> ')}`);
      }
      const dir = path.dirname(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const imps = extractCssImports(content, dir);
      for (const imp of imps) {
        if (imp.exists && !imp.importPath.startsWith('http')) {
          checkCycle(imp.resolvedPath, [...chain, filePath]);
        }
      }
    }

    checkCycle(path.join(CSS_DIR, 'style.css'));
  });

});
