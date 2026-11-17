import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeSuite, assert } from '../core/test-harness.js';
import { scanTemplateInlineStyles, scanJsStyleAssignments, scanCustomElementRegistrations } from '../core/js-scanner.js';
import { scanInlineStylesInHtml } from '../core/dom-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const COMPONENTS_DIR = path.join(PUBLIC_DIR, 'components');
const MODULES_DIR = path.join(PUBLIC_DIR, 'js', 'modules');

describeSuite('Tier 4 - Scenario 2: Game Selection & Player Config in Lobby', { tier: 4 }, (suite) => {

  suite.test('S2.1: Lobby view container (#view-lobby) is defined in index.html', { featureId: 15, milestone: 'M3' }, () => {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf-8');
    assert.match(html, /id=["']view-lobby["']|<t-lobby\b/, 'Lobby view container must exist in index.html');
  });

  suite.test('S2.2: GameCard component provides 3D flip structure with front, back, and variant selector', { featureId: 7, milestone: 'M2' }, () => {
    const gcJs = path.join(COMPONENTS_DIR, 'GameCard.js');
    const content = fs.readFileSync(gcJs, 'utf-8');

    assert.match(content, /card-front/, 'GameCard must render card-front');
    assert.match(content, /card-back/, 'GameCard must render card-back');
    assert.match(content, /variants|stepper/, 'GameCard must handle game variants');
  });

  suite.test('S2.3: Player configuration elements (stepper, boolean toggle, player select card) render cleanly in Light DOM', { featureId: 6, milestone: 'M2' }, () => {
    const pCard = path.join(COMPONENTS_DIR, 'PlayerSelectCard.js');
    const stepper = path.join(COMPONENTS_DIR, 'HudStepper.js');
    const boolCard = path.join(COMPONENTS_DIR, 'HudBooleanCard.js');

    assert.match(fs.readFileSync(pCard, 'utf-8'), /this\.innerHTML\s*=/, 'PlayerSelectCard must write to Light DOM');
    assert.match(fs.readFileSync(stepper, 'utf-8'), /this\.innerHTML\s*=/, 'HudStepper must write to Light DOM');
    assert.match(fs.readFileSync(boolCard, 'utf-8'), /this\.innerHTML\s*=/, 'HudBooleanCard must write to Light DOM');
  });

  suite.test('S2.4: PlayerName atom renders player name and 3-dart average stat badge', { featureId: 7, milestone: 'M2' }, () => {
    const pName = path.join(COMPONENTS_DIR, 'PlayerName.js');
    const content = fs.readFileSync(pName, 'utf-8');
    assert.match(content, /stat|badge|avg/i, 'PlayerName atom must render player stat badge');
  });

  suite.test('S2.5: Zero static inline styles in LobbyController.js or lobby component templates', { featureId: 13, milestone: 'M3' }, () => {
    const lobbyJs = path.join(MODULES_DIR, 'LobbyController.js');
    const styles = scanTemplateInlineStyles(lobbyJs, lobbyJs);
    const forbidden = styles.filter(s => !s.isPermitted);
    assert.equal(forbidden.length, 0, `Forbidden static inline styles in LobbyController.js: ${forbidden.map(f => f.match).join(', ')}`);

    const gcStyles = scanTemplateInlineStyles(path.join(COMPONENTS_DIR, 'GameCard.js'));
    const gcForbidden = gcStyles.filter(s => !s.isPermitted);
    assert.equal(gcForbidden.length, 0, `Forbidden static inline styles in GameCard.js: ${gcForbidden.map(f => f.match).join(', ')}`);
  });

});
