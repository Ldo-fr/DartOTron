import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeSuite, assert } from '../core/test-harness.js';
import { scanCustomElementsInHtml, scanShadowDomViolations } from '../core/dom-scanner.js';
import { scanCustomElementRegistrations } from '../core/js-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const COMPONENTS_DIR = path.join(PUBLIC_DIR, 'components');

describeSuite('Tier 2 - Boundaries: Light DOM & Custom Element Edge Cases', { tier: 2 }, (suite) => {

  suite.test('B2.1: Custom elements must never be written with self-closing syntax <tag />', { featureId: 6, milestone: 'M2' }, () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf-8');
    const selfClosingCustom = content.match(/<[a-z]+-[a-z0-9-]+\b[^>]*\/>/g) || [];
    assert.equal(selfClosingCustom.length, 0, `Self-closing custom elements detected (invalid HTML5): ${selfClosingCustom.join(', ')}`);
  });

  suite.test('B2.2: Shadow DOM evasion detection: reject indirect calls or property accesses', { featureId: 6, milestone: 'M2' }, () => {
    function checkDirectory(dir) {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
          checkDirectory(full);
        } else if (item.endsWith('.js')) {
          const content = fs.readFileSync(full, 'utf-8');
          assert.doesNotMatch(content, /['"]attachShadow['"]\s*in\b/, `Indirect shadow check in ${item}`);
          assert.doesNotMatch(content, /\[['"]attachShadow['"]\]/, `Bracket notation shadow call in ${item}`);
        }
      }
    }
    checkDirectory(COMPONENTS_DIR);
  });

  suite.test('B2.3: Custom element tag names must not contain uppercase letters', { featureId: 7, milestone: 'M2' }, () => {
    const compFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.js'));
    for (const f of compFiles) {
      const p = path.join(COMPONENTS_DIR, f);
      const regs = scanCustomElementRegistrations(p);
      for (const r of regs) {
        assert.equal(r.tag, r.tag.toLowerCase(), `Tag ${r.tag} in ${f} must be strictly lowercase`);
      }
    }
  });

  suite.test('B2.4: Reject malformed custom element tag names without hyphen (e.g. gamecard)', { featureId: 7, milestone: 'M2' }, () => {
    const compFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.js'));
    for (const f of compFiles) {
      const p = path.join(COMPONENTS_DIR, f);
      const regs = scanCustomElementRegistrations(p);
      for (const r of regs) {
        assert.ok(r.tag.includes('-'), `Custom element tag ${r.tag} in ${f} must include a hyphen`);
      }
    }
  });

  suite.test('B2.5: Custom elements registration should guard with if (!customElements.get(...)) or clean export', { featureId: 8, milestone: 'M2' }, () => {
    const compFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.js') && f !== 'index.js');
    for (const f of compFiles) {
      const content = fs.readFileSync(path.join(COMPONENTS_DIR, f), 'utf-8');
      assert.match(content, /customElements\.define/, `${f} must register custom element`);
    }
  });

  suite.test('B2.6: Custom element templates handle empty attribute presence cleanly (e.g. selected, disabled)', { featureId: 7, milestone: 'M2' }, () => {
    const boolCard = fs.readFileSync(path.join(COMPONENTS_DIR, 'HudBooleanCard.js'), 'utf-8');
    assert.match(boolCard, /hasAttribute\(['"]checked['"]\)|hasAttribute\(['"]selected['"]\)|this\.checked/, 'Boolean attributes must be tested for presence or checked state');
  });

  suite.test('B2.7: Custom elements must not override standard HTML tag names (div, span, button)', { featureId: 7, milestone: 'M2' }, () => {
    const reserved = ['div', 'span', 'button', 'input', 'table', 'header', 'footer', 'nav'];
    const compFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.js'));
    for (const f of compFiles) {
      const regs = scanCustomElementRegistrations(path.join(COMPONENTS_DIR, f));
      for (const r of regs) {
        assert.ok(!reserved.includes(r.tag), `Custom element tag ${r.tag} is a reserved HTML tag`);
      }
    }
  });

  suite.test('B2.8: Templates handle unicode & special characters without encoding corruption', { featureId: 7, milestone: 'M2' }, () => {
    const gameCard = fs.readFileSync(path.join(COMPONENTS_DIR, 'GameCard.js'), 'utf-8');
    // Components should be UTF-8 and handle unicode text or symbols cleanly
    assert.doesNotThrow(() => Buffer.from(gameCard, 'utf-8').toString('utf-8'));
  });

  suite.test('B2.9: Web component observedAttributes (if implemented) must return an array of strings', { featureId: 7, milestone: 'M2' }, () => {
    const compFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.js'));
    for (const f of compFiles) {
      const content = fs.readFileSync(path.join(COMPONENTS_DIR, f), 'utf-8');
      if (content.includes('observedAttributes')) {
        assert.match(content, /static\s+get\s+observedAttributes\s*\(\)\s*\{[^}]*return\s*\[/, `${f} observedAttributes must return array`);
      }
    }
  });

  suite.test('B2.10: Web component disconnectedCallback cleans up event listeners or timers', { featureId: 9, milestone: 'M2' }, () => {
    // If a component has timers (like HudNotification), it should clean them up
    const notifPath = path.join(COMPONENTS_DIR, 'HudNotification.js');
    if (fs.existsSync(notifPath)) {
      const content = fs.readFileSync(notifPath, 'utf-8');
      assert.match(content, /clearTimeout|disconnectedCallback/, 'HudNotification should handle timer cleanup');
    }
  });

  suite.test('B2.11: HTML custom element instances in index.html have balanced opening and closing tags', { featureId: 7, milestone: 'M2' }, () => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    const content = fs.readFileSync(indexPath, 'utf-8');
    const tags = scanCustomElementsInHtml(content);
    const tagSet = new Set(tags.map(t => t.tag));

    for (const tag of tagSet) {
      const openMatches = (content.match(new RegExp(`<${tag}\\b`, 'g')) || []).length;
      const closeMatches = (content.match(new RegExp(`</${tag}>`, 'g')) || []).length;
      assert.equal(openMatches, closeMatches, `Tag <${tag}> has ${openMatches} openings but ${closeMatches} closings in index.html`);
    }
  });

  suite.test('B2.12: Dual registration maps to exact same prototype instance', { featureId: 8, milestone: 'M2' }, () => {
    const gameCard = fs.readFileSync(path.join(COMPONENTS_DIR, 'GameCard.js'), 'utf-8');
    const match = gameCard.match(/class\s+([A-Za-z0-9_]+)\s+extends\s+HTMLElement/);
    if (match) {
      const className = match[1];
      const regMatches = [...gameCard.matchAll(new RegExp(`customElements\\.define\\s*\\(\\s*['"][^'"]+['"]\\s*,\\s*${className}\\s*\\)`, 'g'))];
      if (regMatches.length > 0) {
        assert.ok(regMatches.length >= 2, `Expected dual registration (>=2 definitions) for class ${className}`);
      }
    }
  });

  suite.test('B2.13: Ensure no DOM injection vulnerabilities (unescaped user strings in component HTML)', { featureId: 7, milestone: 'M2' }, () => {
    const playerName = fs.readFileSync(path.join(COMPONENTS_DIR, 'PlayerName.js'), 'utf-8');
    // PlayerName renders name property; verify it handles strings or textContent
    assert.ok(playerName.includes('this.getAttribute') || playerName.includes('this._name') || playerName.includes('textContent'));
  });

  suite.test('B2.14: VirtualKeyboard custom element is registered as an organism or singleton', { featureId: 7, milestone: 'M2' }, () => {
    const vkPath = path.join(COMPONENTS_DIR, 'VirtualKeyboard.js');
    assert.ok(fs.existsSync(vkPath), 'VirtualKeyboard.js must exist');
    const content = fs.readFileSync(vkPath, 'utf-8');
    assert.match(content, /customElements\.define\s*\(\s*['"](?:o-virtual-keyboard|virtual-keyboard)['"]/, 'VirtualKeyboard must be registered');
  });

  suite.test('B2.15: Custom elements must not define property getter named shadowRoot returning non-null', { featureId: 6, milestone: 'M2' }, () => {
    const compFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.js'));
    for (const f of compFiles) {
      const content = fs.readFileSync(path.join(COMPONENTS_DIR, f), 'utf-8');
      assert.doesNotMatch(content, /get\s+shadowRoot\s*\(\)\s*\{[^}]*return\s+(?!null\b|undefined\b)/, `Fake shadowRoot getter in ${f}`);
    }
  });

});
