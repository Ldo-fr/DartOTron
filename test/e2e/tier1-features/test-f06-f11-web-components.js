import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeSuite, assert } from '../core/test-harness.js';
import { scanShadowDomViolations } from '../core/dom-scanner.js';
import {
  scanJsStyleAssignments,
  scanCustomElementRegistrations
} from '../core/js-scanner.js';
import {
  extractNativeNestingRules,
  scanCssStatesAndMetrics
} from '../core/css-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const COMPONENTS_DIR = path.join(PUBLIC_DIR, 'components');
const CSS_DIR = path.join(PUBLIC_DIR, 'css');

describeSuite('Tier 1 - Features 6 to 11: Web Components, Light DOM & Scoped Nesting', { tier: 1 }, (suite) => {

  // =========================================================================
  // Feature 6: Light DOM Compliance
  // =========================================================================
  suite.test('F6.1: Zero occurrences of attachShadow across all component files in public/components/', { featureId: 6, milestone: 'M2' }, () => {
    const compFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.js'));
    for (const f of compFiles) {
      const p = path.join(COMPONENTS_DIR, f);
      const violations = scanShadowDomViolations(p);
      const attachViolations = violations.filter(v => v.type === 'attachShadow');
      assert.equal(attachViolations.length, 0, `Forbidden attachShadow detected in ${f} at line ${attachViolations[0]?.line}`);
    }
  });

  suite.test('F6.2: Zero occurrences of attachShadow across all script files in public/js/', { featureId: 6, milestone: 'M2' }, () => {
    function scanDir(dir) {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const fullPath = path.join(dir, f);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (f.endsWith('.js')) {
          const violations = scanShadowDomViolations(fullPath);
          const attachViolations = violations.filter(v => v.type === 'attachShadow');
          assert.equal(attachViolations.length, 0, `Forbidden attachShadow detected in ${f}`);
        }
      }
    }
    scanDir(path.join(PUBLIC_DIR, 'js'));
  });

  suite.test('F6.3: Zero occurrences of shadowRoot across public application code', { featureId: 6, milestone: 'M2' }, () => {
    function scanApp(dir) {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        const fullPath = path.join(dir, f);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanApp(fullPath);
        } else if (f.endsWith('.js') || f.endsWith('.html')) {
          const violations = scanShadowDomViolations(fullPath);
          const rootViolations = violations.filter(v => v.type === 'shadowRoot');
          assert.equal(rootViolations.length, 0, `Forbidden shadowRoot property detected in ${fullPath}`);
        }
      }
    }
    scanApp(PUBLIC_DIR);
  });

  suite.test('F6.4: Zero occurrences of <template shadowrootmode> in HTML files under public/', { featureId: 6, milestone: 'M2' }, () => {
    const htmlFiles = [
      path.join(PUBLIC_DIR, 'index.html'),
      path.join(PUBLIC_DIR, 'companion', 'index.html'),
      path.join(PUBLIC_DIR, 'simulator', 'index.html'),
      path.join(PUBLIC_DIR, 'showcase', 'index.html')
    ];
    for (const f of htmlFiles) {
      if (fs.existsSync(f)) {
        const violations = scanShadowDomViolations(f);
        const tmplViolations = violations.filter(v => v.type.startsWith('shadowroot'));
        assert.equal(tmplViolations.length, 0, `Forbidden shadow root template in ${f}`);
      }
    }
  });

  suite.test('F6.5: All Web Components inherit directly from HTMLElement and write to Light DOM', { featureId: 6, milestone: 'M2' }, () => {
    const compFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.js') && f !== 'index.js');
    for (const f of compFiles) {
      const content = fs.readFileSync(path.join(COMPONENTS_DIR, f), 'utf-8');
      assert.match(content, /class\s+[A-Za-z0-9_]+\s+extends\s+HTMLElement/, `${f} must extend HTMLElement`);
      assert.match(content, /this\.innerHTML\s*=|\.appendChild\(|\.insertAdjacentHTML\(/, `${f} must render into Light DOM`);
    }
  });

  // =========================================================================
  // Feature 7: Atomic Design Tag Taxonomy
  // =========================================================================
  suite.test('F7.1: Atom tags (a-*) taxonomy compliance (a-player-name, a-button, a-badge, a-input)', { featureId: 7, milestone: 'M2' }, () => {
    const indexJs = path.join(COMPONENTS_DIR, 'index.js');
    const content = fs.readFileSync(indexJs, 'utf-8');
    const regFiles = fs.readdirSync(COMPONENTS_DIR).map(f => fs.readFileSync(path.join(COMPONENTS_DIR, f), 'utf-8')).join('\n');

    const hasPlayerNameAtom = /customElements\.define\s*\(\s*['"]a-player-name['"]/.test(regFiles) || /<a-player-name\b/.test(fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8'));
    assert.ok(hasPlayerNameAtom, 'Taxonomy: a-player-name must be defined or registered as an Atom');
  });

  suite.test('F7.2: Molecule tags (m-*) taxonomy compliance (m-game-card, m-boolean-card, m-stepper)', { featureId: 7, milestone: 'M2' }, () => {
    const regFiles = fs.readdirSync(COMPONENTS_DIR).map(f => fs.readFileSync(path.join(COMPONENTS_DIR, f), 'utf-8')).join('\n');
    const hasGameCardMol = /customElements\.define\s*\(\s*['"]m-game-card['"]/.test(regFiles);
    const hasBoolCardMol = /customElements\.define\s*\(\s*['"]m-boolean-card['"]/.test(regFiles);
    const hasStepperMol = /customElements\.define\s*\(\s*['"]m-stepper['"]/.test(regFiles);

    assert.ok(hasGameCardMol, 'Taxonomy: m-game-card must be registered as a Molecule');
    assert.ok(hasBoolCardMol, 'Taxonomy: m-boolean-card must be registered as a Molecule');
    assert.ok(hasStepperMol, 'Taxonomy: m-stepper must be registered as a Molecule');
  });

  suite.test('F7.3: Organism tags (o-*) taxonomy compliance (o-scoreboard-x01, o-scoreboard-cricket)', { featureId: 7, milestone: 'M2' }, () => {
    const regFiles = fs.readdirSync(COMPONENTS_DIR).map(f => fs.readFileSync(path.join(COMPONENTS_DIR, f), 'utf-8')).join('\n');
    const hasX01Org = /customElements\.define\s*\(\s*['"]o-scoreboard-x01['"]/.test(regFiles);
    const hasCricketOrg = /customElements\.define\s*\(\s*['"]o-scoreboard-cricket['"]/.test(regFiles);

    assert.ok(hasX01Org, 'Taxonomy: o-scoreboard-x01 must be registered as an Organism');
    assert.ok(hasCricketOrg, 'Taxonomy: o-scoreboard-cricket must be registered as an Organism');
  });

  suite.test('F7.4: All registered custom element tags match W3C standard regex /^[a-z]+-[a-z0-9-]+$/', { featureId: 7, milestone: 'M2' }, () => {
    const compFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.js'));
    for (const f of compFiles) {
      const p = path.join(COMPONENTS_DIR, f);
      const regs = scanCustomElementRegistrations(p);
      for (const r of regs) {
        assert.match(r.tag, /^[a-z]+-[a-z0-9-]+$/, `Custom element tag ${r.tag} in ${f} must match W3C tag syntax`);
      }
    }
  });

  suite.test('F7.5: Component classes export clean modules matching Atomic conventions', { featureId: 7, milestone: 'M2' }, () => {
    const indexJs = path.join(COMPONENTS_DIR, 'index.js');
    assert.ok(fs.existsSync(indexJs), 'public/components/index.js must exist');
    const content = fs.readFileSync(indexJs, 'utf-8');
    assert.match(content, /export\s+\{/, 'components/index.js must re-export components');
  });

  // =========================================================================
  // Feature 8: Dual Custom Element Registration
  // =========================================================================
  suite.test('F8.1: Dual registration for m-game-card and game-card pointing to same constructor', { featureId: 8, milestone: 'M2' }, () => {
    const gameCardPath = path.join(COMPONENTS_DIR, 'GameCard.js');
    const content = fs.readFileSync(gameCardPath, 'utf-8');
    const regs = scanCustomElementRegistrations(content, gameCardPath);
    const tags = regs.map(r => r.tag);

    assert.ok(tags.includes('m-game-card'), 'GameCard must register m-game-card');
    assert.ok(tags.includes('game-card'), 'GameCard must preserve legacy registration game-card');
  });

  suite.test('F8.2: Dual registration for m-boolean-card and hud-boolean-card pointing to same constructor', { featureId: 8, milestone: 'M2' }, () => {
    const boolPath = path.join(COMPONENTS_DIR, 'HudBooleanCard.js');
    const content = fs.readFileSync(boolPath, 'utf-8');
    const regs = scanCustomElementRegistrations(content, boolPath);
    const tags = regs.map(r => r.tag);

    assert.ok(tags.includes('m-boolean-card'), 'HudBooleanCard must register m-boolean-card');
    assert.ok(tags.includes('hud-boolean-card'), 'HudBooleanCard must preserve legacy registration hud-boolean-card');
  });

  suite.test('F8.3: Dual registration for m-stepper and hud-stepper pointing to same constructor', { featureId: 8, milestone: 'M2' }, () => {
    const stepPath = path.join(COMPONENTS_DIR, 'HudStepper.js');
    const content = fs.readFileSync(stepPath, 'utf-8');
    const regs = scanCustomElementRegistrations(content, stepPath);
    const tags = regs.map(r => r.tag);

    assert.ok(tags.includes('m-stepper'), 'HudStepper must register m-stepper');
    assert.ok(tags.includes('hud-stepper'), 'HudStepper must preserve legacy registration hud-stepper');
  });

  suite.test('F8.4: Dual registration for o-scoreboard-x01 and scoreboard-x01', { featureId: 8, milestone: 'M2' }, () => {
    const x01Path = path.join(COMPONENTS_DIR, 'ScoreboardX01.js');
    const content = fs.readFileSync(x01Path, 'utf-8');
    const regs = scanCustomElementRegistrations(content, x01Path);
    const tags = regs.map(r => r.tag);

    assert.ok(tags.includes('o-scoreboard-x01'), 'ScoreboardX01 must register o-scoreboard-x01');
    assert.ok(tags.includes('scoreboard-x01'), 'ScoreboardX01 must preserve legacy registration scoreboard-x01');
  });

  suite.test('F8.5: Dual registration for o-scoreboard-cricket and scoreboard-cricket', { featureId: 8, milestone: 'M2' }, () => {
    const cricketPath = path.join(COMPONENTS_DIR, 'ScoreboardCricket.js');
    const content = fs.readFileSync(cricketPath, 'utf-8');
    const regs = scanCustomElementRegistrations(content, cricketPath);
    const tags = regs.map(r => r.tag);

    assert.ok(tags.includes('o-scoreboard-cricket'), 'ScoreboardCricket must register o-scoreboard-cricket');
    assert.ok(tags.includes('scoreboard-cricket'), 'ScoreboardCricket must preserve legacy registration scoreboard-cricket');
  });

  // =========================================================================
  // Feature 9: Component Host Style Cleanup
  // =========================================================================
  suite.test('F9.1: Zero static this.style.display or this.style.width in GameCard.js connectedCallback', { featureId: 9, milestone: 'M2' }, () => {
    const p = path.join(COMPONENTS_DIR, 'GameCard.js');
    const content = fs.readFileSync(p, 'utf-8');
    const assigns = scanJsStyleAssignments(content, p);
    const hostStyles = assigns.filter(a => a.isHostStyle && !a.isPermitted);

    assert.equal(hostStyles.length, 0, `GameCard.js still contains ${hostStyles.length} static host styles: ${hostStyles.map(h => h.raw).join(', ')}`);
  });

  suite.test('F9.2: Zero static this.style.display in HudBooleanCard.js connectedCallback', { featureId: 9, milestone: 'M2' }, () => {
    const p = path.join(COMPONENTS_DIR, 'HudBooleanCard.js');
    const content = fs.readFileSync(p, 'utf-8');
    const assigns = scanJsStyleAssignments(content, p);
    const hostStyles = assigns.filter(a => a.isHostStyle && !a.isPermitted);

    assert.equal(hostStyles.length, 0, `HudBooleanCard.js still contains static host styles: ${hostStyles.map(h => h.raw).join(', ')}`);
  });

  suite.test('F9.3: Zero static this.style.display or this.style.flex in ScoreboardX01.js', { featureId: 9, milestone: 'M2' }, () => {
    const p = path.join(COMPONENTS_DIR, 'ScoreboardX01.js');
    const content = fs.readFileSync(p, 'utf-8');
    const assigns = scanJsStyleAssignments(content, p);
    const hostStyles = assigns.filter(a => a.isHostStyle && !a.isPermitted);

    assert.equal(hostStyles.length, 0, `ScoreboardX01.js still contains static host styles: ${hostStyles.map(h => h.raw).join(', ')}`);
  });

  suite.test('F9.4: Zero static this.style.display or this.style.flex in ScoreboardCricket.js', { featureId: 9, milestone: 'M2' }, () => {
    const p = path.join(COMPONENTS_DIR, 'ScoreboardCricket.js');
    const content = fs.readFileSync(p, 'utf-8');
    const assigns = scanJsStyleAssignments(content, p);
    const hostStyles = assigns.filter(a => a.isHostStyle && !a.isPermitted);

    assert.equal(hostStyles.length, 0, `ScoreboardCricket.js still contains static host styles: ${hostStyles.map(h => h.raw).join(', ')}`);
  });

  suite.test('F9.5: Zero static this.style.* across all components in public/components/', { featureId: 9, milestone: 'M2' }, () => {
    const compFiles = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.js'));
    const allHostStyles = [];

    for (const f of compFiles) {
      const p = path.join(COMPONENTS_DIR, f);
      const assigns = scanJsStyleAssignments(p, p);
      const forbidden = assigns.filter(a => a.isHostStyle && !a.isPermitted);
      if (forbidden.length > 0) {
        allHostStyles.push({ file: f, violations: forbidden.map(v => v.raw) });
      }
    }

    assert.equal(allHostStyles.length, 0, `Static host styles detected across ${allHostStyles.length} components: ${JSON.stringify(allHostStyles)}`);
  });

  // =========================================================================
  // Feature 10: Component Scoped CSS Nesting
  // =========================================================================
  suite.test('F10.1: Scoped CSS for m-game-card uses component tag as top-level root selector', { featureId: 10, milestone: 'M2' }, () => {
    let css = '';
    const compCssPath = path.join(CSS_DIR, 'components', 'molecules', 'm-game-card.css');
    if (fs.existsSync(compCssPath)) {
      css = fs.readFileSync(compCssPath, 'utf-8');
    } else {
      css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    const hasTagRoot = /(?:m-game-card|game-card)\b[^{]*\{/.test(css);
    assert.ok(hasTagRoot, 'm-game-card or game-card must be used as root selector in component stylesheet');
  });

  suite.test('F10.2: Native CSS nesting (&) is used for child classes within component rules', { featureId: 10, milestone: 'M2' }, () => {
    let css = '';
    const compCssDir = path.join(CSS_DIR, 'components');
    if (fs.existsSync(compCssDir)) {
      function collectCss(dir) {
        let str = '';
        for (const item of fs.readdirSync(dir)) {
          const fp = path.join(dir, item);
          if (fs.statSync(fp).isDirectory()) str += collectCss(fp);
          else if (item.endsWith('.css')) str += fs.readFileSync(fp, 'utf-8') + '\n';
        }
        return str;
      }
      css = collectCss(compCssDir);
    } else {
      css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    const nestingRules = extractNativeNestingRules(css);
    assert.ok(nestingRules.length >= 5, `Expected at least 5 native CSS nesting (&) rules, found ${nestingRules.length}`);
  });

  suite.test('F10.3: Attribute modifiers are nested with &[attr] (e.g. &[selected], &[disabled])', { featureId: 10, milestone: 'M2' }, () => {
    let css = '';
    const compCssDir = path.join(CSS_DIR, 'components');
    if (fs.existsSync(compCssDir)) {
      function collectCss(dir) {
        let str = '';
        for (const item of fs.readdirSync(dir)) {
          const fp = path.join(dir, item);
          if (fs.statSync(fp).isDirectory()) str += collectCss(fp);
          else if (item.endsWith('.css')) str += fs.readFileSync(fp, 'utf-8') + '\n';
        }
        return str;
      }
      css = collectCss(compCssDir);
    } else {
      css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    const nestingRules = extractNativeNestingRules(css);
    const hasAttrModifier = nestingRules.some(r => /&\[[a-zA-Z0-9_-]+(?:=[^\]]+)?\]/.test(r.selector));
    assert.ok(hasAttrModifier, 'Component styles must use native nesting with attribute modifiers (&[selected], &[disabled])');
  });

  suite.test('F10.4: Component styles avoid unscoped global class leakage', { featureId: 10, milestone: 'M2' }, () => {
    let css = '';
    const compCssDir = path.join(CSS_DIR, 'components');
    if (fs.existsSync(compCssDir)) {
      const atomsDir = path.join(compCssDir, 'atoms');
      if (fs.existsSync(atomsDir)) {
        for (const file of fs.readdirSync(atomsDir)) {
          const c = fs.readFileSync(path.join(atomsDir, file), 'utf-8');
          // Should start with tag selector or atom class
          assert.match(c, /^[ \t\n]*(?:\/\*[\s\S]*?\*\/[ \t\n]*)*[a-z0-9_-]+/i, `${file} should be structured cleanly`);
        }
      }
    }
  });

  suite.test('F10.5: Component host display properties are declared in CSS, not inline JS', { featureId: 10, milestone: 'M2' }, () => {
    let css = '';
    const compCssDir = path.join(CSS_DIR, 'components');
    if (fs.existsSync(compCssDir)) {
      function collectCss(dir) {
        let str = '';
        for (const item of fs.readdirSync(dir)) {
          const fp = path.join(dir, item);
          if (fs.statSync(fp).isDirectory()) str += collectCss(fp);
          else if (item.endsWith('.css')) str += fs.readFileSync(fp, 'utf-8') + '\n';
        }
        return str;
      }
      css = collectCss(compCssDir);
    } else {
      css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    }

    // Host selectors should declare display (e.g. m-game-card { display: block; })
    assert.match(css, /(?:m-game-card|game-card)\b[^{]*\{[^}]*display\s*:\s*block/s, 'Component host selector must define display: block in CSS');
  });

  // =========================================================================
  // Feature 11: Component States & Modifiers
  // =========================================================================
  suite.test('F11.1: Interactive components define :hover pseudo-class with visual feedback', { featureId: 11, milestone: 'M2' }, () => {
    const mainCss = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    const metrics = scanCssStatesAndMetrics(mainCss);
    assert.ok(metrics.hoverCount >= 10, `Expected at least 10 :hover rules for arcade touch & mouse feedback, found ${metrics.hoverCount}`);
  });

  suite.test('F11.2: Interactive components define :focus-visible with accessible high-contrast focus rings', { featureId: 11, milestone: 'M2' }, () => {
    let css = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    if (fs.existsSync(path.join(CSS_DIR, 'base', 'reset.css'))) {
      css += fs.readFileSync(path.join(CSS_DIR, 'base', 'reset.css'), 'utf-8');
    }
    const metrics = scanCssStatesAndMetrics(css);
    assert.ok(metrics.focusVisibleCount >= 5, `Expected at least 5 :focus-visible / :focus rules, found ${metrics.focusVisibleCount}`);
  });

  suite.test('F11.3: Tactile arcade buttons define :active state with scale depression', { featureId: 11, milestone: 'M2' }, () => {
    const mainCss = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    const metrics = scanCssStatesAndMetrics(mainCss);
    assert.ok(metrics.activeCount >= 10, `Expected at least 10 :active rules for tactile arcade depression feedback, found ${metrics.activeCount}`);
  });

  suite.test('F11.4: Disabled states define :disabled or [disabled] with reduced opacity and pointer-events', { featureId: 11, milestone: 'M2' }, () => {
    const mainCss = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    const metrics = scanCssStatesAndMetrics(mainCss);
    assert.ok(metrics.disabledCount >= 4, `Expected at least 4 :disabled or [disabled] rules, found ${metrics.disabledCount}`);
  });

  suite.test('F11.5: Interactive card modifiers ([selected], [active]) provide clear visual feedback', { featureId: 11, milestone: 'M2' }, () => {
    const mainCss = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf-8');
    assert.match(mainCss, /\[selected\]|\.selected\b/, 'Styles must handle selected modifier');
    assert.match(mainCss, /\[active\]|\.active\b/, 'Styles must handle active modifier');
  });

});
