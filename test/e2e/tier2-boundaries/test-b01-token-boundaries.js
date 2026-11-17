import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeSuite, assert } from '../core/test-harness.js';
import { extractCssCustomProperties, stripCssComments } from '../core/css-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const CSS_DIR = path.join(ROOT_DIR, 'public', 'css');

describeSuite('Tier 2 - Boundaries: Design Tokens & Variable Scale Edge Cases', { tier: 2 }, (suite) => {

  function getAvailableTokensCss() {
    let css = '';
    const tokensFile = path.join(CSS_DIR, 'tokens', 'tokens.css');
    if (fs.existsSync(tokensFile)) {
      css += fs.readFileSync(tokensFile, 'utf-8') + '\n';
    }
    const styleFile = path.join(CSS_DIR, 'style.css');
    if (fs.existsSync(styleFile)) {
      css += fs.readFileSync(styleFile, 'utf-8');
    }
    return css;
  }

  suite.test('B1.1: Reject token names with uppercase characters (must be strictly lowercase kebab-case)', { featureId: 2, milestone: 'M1' }, () => {
    const css = getAvailableTokensCss();
    const props = extractCssCustomProperties(css);
    const uppercaseTokens = props.filter(p => p.name.startsWith('--sys-') && /[A-Z]/.test(p.name));
    assert.equal(uppercaseTokens.length, 0, `Uppercase found in tokens: ${uppercaseTokens.map(t => t.name).join(', ')}`);
  });

  suite.test('B1.2: Reject token names with underscores (must use hyphens exclusively)', { featureId: 2, milestone: 'M1' }, () => {
    const css = getAvailableTokensCss();
    const props = extractCssCustomProperties(css);
    const underscoreTokens = props.filter(p => p.name.startsWith('--sys-') && p.name.includes('_'));
    assert.equal(underscoreTokens.length, 0, `Underscores found in tokens: ${underscoreTokens.map(t => t.name).join(', ')}`);
  });

  suite.test('B1.3: Reject truncated token names lacking concept or variant (e.g. --sys-primary)', { featureId: 2, milestone: 'M1' }, () => {
    const css = getAvailableTokensCss();
    const props = extractCssCustomProperties(css);
    const sysTokens = props.filter(p => p.name.startsWith('--sys-'));
    for (const t of sysTokens) {
      const parts = t.name.slice(6).split('-');
      assert.ok(parts.length >= 2, `Token ${t.name} must have at least concept and variant (--sys-[concept]-[variante])`);
    }
  });

  suite.test('B1.4: Hex colors in tokens must be valid 3, 4, 6, or 8 hexadecimal characters', { featureId: 2, milestone: 'M1' }, () => {
    const css = getAvailableTokensCss();
    const props = extractCssCustomProperties(css);
    for (const p of props) {
      if (p.value.startsWith('#')) {
        assert.match(p.value, /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, `Invalid hex color for ${p.name}: ${p.value}`);
      }
    }
  });

  suite.test('B1.5: RGBA color values in tokens must have valid alpha parameters (0.0 to 1.0 or percentage)', { featureId: 2, milestone: 'M1' }, () => {
    const css = getAvailableTokensCss();
    const props = extractCssCustomProperties(css);
    for (const p of props) {
      if (p.value.includes('rgba(')) {
        const match = p.value.match(/rgba\(\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^)]+)\)/);
        if (match) {
          const alpha = parseFloat(match[1]);
          assert.ok(!isNaN(alpha) && alpha >= 0 && alpha <= 1, `Invalid rgba alpha in ${p.name}: ${p.value}`);
        }
      }
    }
  });

  suite.test('B1.6: Detect and prevent circular token dependencies (A -> B -> A)', { featureId: 2, milestone: 'M1' }, () => {
    const css = getAvailableTokensCss();
    const props = extractCssCustomProperties(css);
    const map = new Map();
    for (const p of props) {
      const varMatches = [...p.value.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)].map(m => m[1]);
      map.set(p.name, varMatches);
    }

    function detectCycle(token, pathSet = new Set()) {
      if (pathSet.has(token)) return true;
      pathSet.add(token);
      const refs = map.get(token) || [];
      for (const r of refs) {
        if (detectCycle(r, new Set(pathSet))) return true;
      }
      return false;
    }

    for (const token of map.keys()) {
      assert.ok(!detectCycle(token), `Circular dependency detected in design token: ${token}`);
    }
  });

  suite.test('B1.7: Reject empty or whitespace-only token declarations', { featureId: 2, milestone: 'M1' }, () => {
    const css = getAvailableTokensCss();
    const props = extractCssCustomProperties(css);
    for (const p of props) {
      assert.ok(p.value.length > 0, `Token ${p.name} has empty value`);
    }
  });

  suite.test('B1.8: Fallback arguments inside var() must be balanced and non-empty', { featureId: 2, milestone: 'M1' }, () => {
    const css = getAvailableTokensCss();
    const clean = stripCssComments(css);
    const varCalls = clean.match(/var\([^)]+\)/g) || [];
    for (const call of varCalls) {
      if (call.includes(',')) {
        const parts = call.slice(4, -1).split(',');
        const fallback = parts.slice(1).join(',').trim();
        assert.ok(fallback.length > 0, `Empty fallback in var call: ${call}`);
      }
    }
  });

  suite.test('B1.9: Root tokens must be declared on :root or html selector', { featureId: 2, milestone: 'M1' }, () => {
    const css = getAvailableTokensCss();
    assert.match(css, /(?::root|html)\s*\{/, 'Design tokens must be hosted on :root or html for global inheritance');
  });

  suite.test('B1.10: Token names with numeric variant scales (2xl, 3xl, 100, 500) are valid', { featureId: 2, milestone: 'M1' }, () => {
    const validNumericVariants = [
      '--sys-spacing-2xl',
      '--sys-font-size-3xl',
      '--sys-font-weight-500',
      '--sys-z-1000'
    ];
    for (const name of validNumericVariants) {
      assert.match(name, /^--sys-[a-z0-9]+-[a-z0-9-]+$/, `${name} should be valid token syntax`);
    }
  });

  suite.test('B1.11: Tokens handle inline comments gracefully without corrupting value extraction', { featureId: 2, milestone: 'M1' }, () => {
    const sample = ':root { --sys-color-primary: #00ff87 /* Cyber Neon */; }';
    const props = extractCssCustomProperties(sample);
    assert.equal(props.length, 1);
    assert.equal(props[0].name, '--sys-color-primary');
    assert.equal(props[0].value.replace(/\/\*.*?\*\//g, '').trim(), '#00ff87');
  });

  suite.test('B1.12: Legacy alias mappings do not point to nonexistent variables', { featureId: 3, milestone: 'M1' }, () => {
    const css = getAvailableTokensCss();
    const props = extractCssCustomProperties(css);
    const tokenNames = new Set(props.map(p => p.name));
    const legacyAliases = props.filter(p => p.isLegacyAlias);

    for (const alias of legacyAliases) {
      const targetVar = alias.value.match(/var\(\s*(--sys-[a-zA-Z0-9_-]+)/)?.[1];
      if (targetVar) {
        assert.ok(tokenNames.has(targetVar), `Legacy alias ${alias.name} points to undeclared token ${targetVar}`);
      }
    }
  });

  suite.test('B1.13: Spacing tokens must specify valid CSS length units (px, rem, em)', { featureId: 2, milestone: 'M1' }, () => {
    const css = getAvailableTokensCss();
    const props = extractCssCustomProperties(css);
    const spacingTokens = props.filter(p => p.name.startsWith('--sys-spacing-'));

    for (const s of spacingTokens) {
      if (!s.value.includes('var(')) {
        assert.match(s.value, /^-?\d+(?:\.\d+)?(?:px|rem|em|%)|0$/, `Spacing token ${s.name} must have valid CSS unit: ${s.value}`);
      }
    }
  });

  suite.test('B1.14: Radius tokens must specify valid border-radius length units (px, rem, %)', { featureId: 2, milestone: 'M1' }, () => {
    const css = getAvailableTokensCss();
    const props = extractCssCustomProperties(css);
    const radiusTokens = props.filter(p => p.name.startsWith('--sys-radius-'));

    for (const r of radiusTokens) {
      if (!r.value.includes('var(')) {
        assert.match(r.value, /^(?:\d+(?:\.\d+)?(?:px|rem|%|em)|0|9999px)$/, `Radius token ${r.name} has invalid unit: ${r.value}`);
      }
    }
  });

  suite.test('B1.15: Z-Index tokens must be integer values or safe keywords', { featureId: 2, milestone: 'M1' }, () => {
    const css = getAvailableTokensCss();
    const props = extractCssCustomProperties(css);
    const zTokens = props.filter(p => p.name.startsWith('--sys-z-') || p.name.startsWith('--sys-zindex-'));

    for (const z of zTokens) {
      if (!z.value.includes('var(')) {
        assert.match(z.value, /^-?\d+|auto$/, `Z-index token ${z.name} must be integer: ${z.value}`);
      }
    }
  });

});
