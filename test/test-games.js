import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

import { CConfig } from '../server/config.js';
import { CScores } from '../server/scores.js';
import { MatchEngine } from '../server/engine/MatchEngine.js';
import { GAMES_REGISTRY } from '../server/games/index.js';
import { createDartOTronServer } from '../server/index.js';
import { generateQRCodeSVG } from '../public/js/lib/qrcode.js';

const TEST_DATA_DIR = path.join(os.tmpdir(), 'dartotron-test-data');
process.env.DARTOTRON_DATA_DIR = TEST_DATA_DIR;
try {
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
} catch {
  // ignore
}

test('All 6 games initialize and process turns without error', () => {
  const config = new CConfig();
  config.SetValue('SectionAdvanced', 'noserial', true);
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  const gameIds = Object.keys(GAMES_REGISTRY);
  assert.equal(gameIds.length, 6);

  for (const gameId of gameIds) {
    const players = ['Alice', 'Bob', 'Charlie'];
    const state = engine.startMatch({
      gameId,
      players,
      options: {}
    });

    assert.equal(state.status, 'playing', `${gameId} should start in playing state`);
    assert.equal(state.gameId, gameId);
    assert.equal(state.players.length, players.length);

    // Throw 3 darts for player 1
    let s1 = engine.handleInput('T20');
    assert.ok(s1);
    let s2 = engine.handleInput('D15');
    assert.ok(s2);
    let s3 = engine.handleInput('SB');
    assert.ok(s3);

    // Test BACKUPBUTTON (undo)
    const sUndo = engine.handleInput('BACKUPBUTTON');
    assert.ok(sUndo);

    // Test MISSDART & PLAYERBUTTON
    engine.handleInput('MISSDART');
    engine.handleInput('PLAYERBUTTON');

    // Test GAMEBUTTON (abort)
    const sEnd = engine.handleInput('GAMEBUTTON');
    assert.equal(sEnd.status, 'finished');
    assert.equal(sEnd.endReason, 'interrupted');
  }
});

test('Ho_One 301 full victory and undo check', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Ho_One',
    players: ['Charlie'],
    options: { startingat: 101, double_out: false }
  });

  // 101 -> T20 (60) -> 41 -> S20 (20) -> 21 -> S20 (20) -> 1
  engine.handleInput('T20');
  engine.handleInput('S20');
  let st = engine.handleInput('S20');
  assert.equal(st.players[0].score, 1);
  assert.equal(st.status, 'waiting_player', 'End of turn must wait for PLAYERBUTTON');

  // Next round starts on PLAYERBUTTON
  st = engine.handleInput('PLAYERBUTTON');
  assert.equal(st.status, 'playing');

  // Next round: S1 wins (1 - 1 = 0)
  st = engine.handleInput('S1');
  assert.equal(st.status, 'finished');
  assert.equal(st.endReason, 'victory');
  assert.equal(st.winner.PlayerName, 'Charlie');
});

test('Ho_One: stats PPD and PPR are not calculated before scoring starts (miss or double_in waiting)', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Ho_One',
    players: ['Charlie'],
    options: { startingat: 501, double_in: true }
  });

  // Charlie hits S20 without having hit a double first (double_in waiting)
  let st = engine.handleInput('S20');
  assert.equal(st.players[0].score, 501);
  assert.equal(st.players[0].LSTColVal[5][0], '-');
  assert.equal(st.players[0].LSTColVal[6][0], '-');

  // Charlie misses
  st = engine.handleInput('MISSDART');
  assert.equal(st.players[0].score, 501);
  assert.equal(st.players[0].LSTColVal[5][0], '-');
  assert.equal(st.players[0].LSTColVal[6][0], '-');
});

test('Cricket closing numbers and scoring points', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Cricket',
    players: ['J1', 'J2'],
    options: {}
  });

  // J1 hits T20 (closes 20) + S20 (scores 20 pts)
  engine.handleInput('T20');
  const st = engine.handleInput('S20');
  assert.equal(st.players[0].score, 20);
  // Column 0 is '20' -> LED value should be 3
  assert.equal(st.players[0].columns[0].value, 3);
  assert.equal(st.players[0].columns[0].type, 'led');
});

test('Cricket optioncrazycutthroatmaster: randomizes all 7 headers including Bull and adds 25 pts on miss', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Cricket',
    players: ['J1', 'J2'],
    options: { optioncrazycutthroatmaster: true }
  });

  // Pre-dart checks should run on turn 1
  const st1 = engine.handleInput('MISSDART');
  // Player 1 score should have increased by +25 on MISSDART in crazycutthroatmaster
  assert.equal(st1.players[0].score, 25);

  assert.equal(st1.missPenalty, 25);
  // Check that all 7 headers are randomized and unique
  assert.equal(st1.headers.length, 7);
  const uniqueHeaders = new Set(st1.headers);
  assert.equal(uniqueHeaders.size, 7);
});

test('Ho_One option noout: missPenalty is 25 and adds 25 pts on miss', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Ho_One',
    players: ['J1', 'J2'],
    options: { startingat: 501, noout: true }
  });

  const initial = engine.getStateAndFlushEvents();
  assert.equal(initial.missPenalty, 25);

  const st1 = engine.handleInput('MISSDART');
  // 501 with noout: missing adds +25 points
  assert.equal(st1.players[0].score, 526);
});

test('Chimay Bleu record (3 times the same Triple in one turn)', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Ho_One',
    players: ['Charlie'],
    options: { startingat: 501 }
  });

  // Charlie throws T19, T19, T19 in a single turn
  engine.handleInput('T19');
  engine.handleInput('T19');
  const st = engine.handleInput('T19');

  const chimayMsg = st.events.find(e => e.type === 'message' && e.text.includes('CHIMAY BLEU'));
  assert.ok(chimayMsg, 'Should emit a Chimay Bleu announcement message');

  // Verify that during play, impacts and records are buffered in memory (not written to DB until completed)
  assert.equal(engine.matchRecordsBuffer.length, 1);
  assert.equal(engine.matchHitsBuffer.length, 3);

  // When match finishes, buffered impacts and records are committed to SQLite
  engine.finishMatch('victory', 0);

  const prof = scores.GetPlayerProfile('Charlie');
  assert.ok(prof.chimayCount >= 1);
  assert.equal(prof.chimayHistory[0].triple, 'T19');
  assert.ok(prof.chimayHistory[0].date);
});

test('Serial char mapping & Calibration save', () => {
  const config = new CConfig();
  config.updateKeys({ T20: 'A', DB: 'B', PLAYERBUTTON: 'P' });
  assert.equal(config.GetValue('SectionKeys', 'T20'), 'A');
  assert.equal(config.isCalibrated(), true);
});

test('HTTP Server & API endpoints respond properly', async () => {
  const config = new CConfig();
  config.SetValue('SectionAdvanced', 'noserial', true);
  const app = createDartOTronServer({ config });
  await app.start(0, '127.0.0.1');
  const addr = app.server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    const bootRes = await fetch(`${baseUrl}/api/bootstrap`);
    assert.equal(bootRes.status, 200);
    const bootData = await bootRes.json();
    assert.equal(bootData.games.length, 6);

    const startRes = await fetch(`${baseUrl}/api/match/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: 'Kinito',
        players: ['Alice', 'Bob'],
        options: { max_round: 7 }
      })
    });
    assert.equal(startRes.status, 200);
    const startData = await startRes.json();
    assert.equal(startData.match.gameId, 'Kinito');

    // Test /api/players persistence & multi-session stats
    const plPostRes = await fetch(`${baseUrl}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activePlayers: ['Charlie', 'Alice'],
        knownPlayers: ['Charlie', 'Alice', 'Bob']
      })
    });
    assert.equal(plPostRes.status, 200);
    const plData = await plPostRes.json();
    assert.deepEqual(plData.activePlayers, ['Charlie', 'Alice']);
    assert.ok(plData.knownPlayers.includes('Charlie'));
    const charlieStat = plData.stats.find(s => s.name === 'Charlie');
    assert.ok(charlieStat, 'Charlie should have multi-session stats');
    assert.ok(charlieStat.wins >= 1, 'Charlie should have recorded victory from earlier test');

    // Test /api/players/profile detailed player stats & records endpoint
    const profRes = await fetch(`${baseUrl}/api/players/profile?name=Charlie`);
    assert.equal(profRes.status, 200);
    const profData = await profRes.json();
    assert.equal(profData.profile.name, 'Charlie');
    assert.ok(profData.profile.gamesPlayed >= 1);
    assert.ok(profData.profile.wins >= 1);
    assert.ok(Array.isArray(profData.profile.byGame));
    assert.ok(profData.profile.byGame.length >= 1);
    assert.ok(Array.isArray(profData.profile.recentScores));

    // Test /api/records/chimay endpoint
    const chimayRes = await fetch(`${baseUrl}/api/records/chimay`);
    assert.equal(chimayRes.status, 200);
    const chimayData = await chimayRes.json();
    assert.ok(Array.isArray(chimayData.leaderboard));
    assert.ok(Array.isArray(chimayData.history));
    assert.ok(chimayData.history.some(h => h.playername === 'Charlie' && h.triple === 'T19'));

    // Test /api/players/rename: rename Charlie -> Charles (preserving stats & Chimay records)
    const renConflictRes = await fetch(`${baseUrl}/api/players/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName: 'Charlie', newName: 'Alice' })
    });
    assert.equal(renConflictRes.status, 400, 'Should prevent renaming to an existing player name');

    const renOkRes = await fetch(`${baseUrl}/api/players/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName: 'Charlie', newName: 'Charles' })
    });
    assert.equal(renOkRes.status, 200);
    const renOkData = await renOkRes.json();
    assert.deepEqual(renOkData.activePlayers, ['Charles', 'Alice']);
    assert.ok(renOkData.knownPlayers.includes('Charles'));
    assert.ok(!renOkData.knownPlayers.includes('Charlie'));
    const charlesStat = renOkData.stats.find(s => s.name === 'Charles');
    assert.ok(charlesStat && charlesStat.wins >= 1, 'Renamed player should keep all stats');

    // Test /api/players/delete: should block deleting an active player (Charles)
    const delActiveRes = await fetch(`${baseUrl}/api/players/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Charles' })
    });
    assert.equal(delActiveRes.status, 400);

    // Deselect Charles from activePlayers, then delete Charles completely
    await fetch(`${baseUrl}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activePlayers: ['Alice', 'Bob'],
        knownPlayers: ['Charles', 'Alice', 'Bob']
      })
    });

    const delOkRes = await fetch(`${baseUrl}/api/players/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Charles' })
    });
    assert.equal(delOkRes.status, 200);
    const delOkData = await delOkRes.json();
    assert.ok(!delOkData.knownPlayers.includes('Charles'), 'Charles should be removed from knownPlayers');
    assert.ok(!delOkData.stats.some(s => s.name === 'Charles'), 'Charles stats should be deleted');

    const chimayAfterDel = await (await fetch(`${baseUrl}/api/records/chimay`)).json();
    assert.ok(!chimayAfterDel.history.some(h => h.playername === 'Charles'), 'Charles Chimay records should be deleted');

    // Test static asset route
    const soundRes = await fetch(`${baseUrl}/sounds/click.mp3`);
    assert.equal(soundRes.status, 200);

    const notifSoundRes = await fetch(`${baseUrl}/sounds/notification.mp3`);
    assert.equal(notifSoundRes.status, 200);

    // Test Web Components serving
    const compIndexRes = await fetch(`${baseUrl}/components/index.js`);
    assert.equal(compIndexRes.status, 200);
    const compIndexCode = await compIndexRes.text();
    assert.ok(compIndexCode.includes('GameCard'), 'Component index should export GameCard');

    const stepperRes = await fetch(`${baseUrl}/components/HudStepper.js`);
    assert.equal(stepperRes.status, 200);

    const notifRes = await fetch(`${baseUrl}/components/HudNotification.js`);
    assert.equal(notifRes.status, 200);

    const dropdownRes = await fetch(`${baseUrl}/components/HudPlayerDropdown.js`);
    assert.equal(dropdownRes.status, 200);

    const colRes = await fetch(`${baseUrl}/components/HudStatsColumn.js`);
    assert.equal(colRes.status, 200);

    const metricRes = await fetch(`${baseUrl}/components/HudStatsMetric.js`);
    assert.equal(metricRes.status, 200);

    const gaugeRes = await fetch(`${baseUrl}/components/HudStatsGauge.js`);
    assert.equal(gaugeRes.status, 200);

    const teleRes = await fetch(`${baseUrl}/components/HudStatsTelemetry.js`);
    assert.equal(teleRes.status, 200);

    // In production mode, /showcase workbench is not accessible (404)
    const scProdRes = await fetch(`${baseUrl}/showcase`);
    assert.equal(scProdRes.status, 404, '/showcase should return 404 in production mode');

    // Test /api/system/quit endpoint
    const quitRes = await fetch(`${baseUrl}/api/system/quit`, { method: 'POST' });
    assert.equal(quitRes.status, 200);
    const quitData = await quitRes.json();
    assert.equal(quitData.ok, true);
  } finally {
    await app.stop();
  }
});

test('No game calculates statistics (PPD, PPR, MPR, scorePerRound, AVG) before points/hits are scored', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  const testGames = [
    { gameId: 'Ho_One', opts: { startingat: 501 } },
    { gameId: 'Cricket', opts: {} },
    { gameId: '321_Zlip', opts: {} },
    { gameId: 'By_Fives', opts: {} },
    { gameId: 'Practice', opts: {} },
    { gameId: 'Kinito', opts: {} }
  ];

  for (const { gameId, opts } of testGames) {
    const st0 = engine.startMatch({
      gameId,
      players: ['PlayerA', 'PlayerB'],
      options: opts
    });

    // PlayerA throws a miss dart without scoring any points
    const st1 = engine.handleInput('MISSDART');
    const pA = st1.players[0];

    assert.equal(pA.dartsthrown, 1);
    assert.equal(pA.scorePerRound, 0.0, `${gameId} scorePerRound should be 0.0 when 0 points scored`);

    if (pA.Stats?.MPR !== undefined) {
      assert.equal(pA.Stats.MPR, 0.0, `${gameId} MPR should be 0.0 before scoring hits`);
    }
    if (pA.Stats?.['Points Per Dart'] !== undefined) {
      assert.equal(pA.Stats['Points Per Dart'], 0.0, `${gameId} PPD should be 0.0 before scoring points`);
    }
    if (pA.Stats?.['Points Per Round'] !== undefined) {
      assert.equal(pA.Stats['Points Per Round'], 0.0, `${gameId} PPR should be 0.0 before scoring points`);
    }
    if (pA.Stats?.['Hits per round'] !== undefined) {
      assert.equal(pA.Stats['Hits per round'], 0.0, `${gameId} Hits per round should be 0.0 before scoring hits`);
    }

    // Abort game
    engine.handleInput('GAMEBUTTON');
  }
});

test('Headers do not contain empty strings or dummy dashes for generic games', () => {
  const games = ['321_Zlip', 'Kinito', 'By_Fives', 'Practice'];
  for (const g of games) {
    const mod = GAMES_REGISTRY[g].module;
    assert.ok(Array.isArray(mod.Headers), `${g} Headers should be an array`);
    for (const h of mod.Headers) {
      assert.ok(h && h.trim() !== '' && h !== '-', `${g} header '${h}' should not be empty or '-'`);
    }
  }
  assert.deepEqual(GAMES_REGISTRY['321_Zlip'].module.Headers, ['D1', 'D2', 'D3', 'Zlip']);
  assert.deepEqual(GAMES_REGISTRY.Kinito.module.Headers, ['Min', 'Total', 'Kinito']);
  assert.deepEqual(GAMES_REGISTRY.By_Fives.module.Headers, ['Tour', 'D1', 'D2', 'D3']);
  assert.deepEqual(GAMES_REGISTRY.Practice.module.Headers, ['Cible', 'D1', 'D2', 'D3']);
});

test('Player turn transition: unified waiting_player state without time limit, locked board, and release-darts announcement', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Ho_One',
    players: ['Alice', 'Bob'],
    options: { startingat: 301, double_out: false }
  });

  // 1. Turn ends after 3 darts thrown
  engine.handleInput('T20');
  engine.handleInput('T20');
  let st = engine.handleInput('T20');

  assert.equal(st.status, 'waiting_player', 'Must enter waiting_player after 3 darts');
  assert.equal(st.actualplayer, 0, 'Must still be Alice while waiting');
  const releaseMsg = st.events.find(e => e.type === 'message' && e.text.includes('Retirez les flèches'));
  assert.ok(releaseMsg, 'Announcement "Retirez les flèches" must be emitted');
  assert.equal(releaseMsg.duration, 10000, 'Announcement duration must be 10000 ms (10s timer)');

  // While waiting, board must be locked: stray darts or misses must be ignored
  st = engine.handleInput('S20');
  assert.equal(st.status, 'waiting_player', 'Board must ignore hits while waiting');
  assert.equal(st.players[0].score, 121, 'Alice score unchanged by stray hit');
  st = engine.handleInput('MISSDART');
  assert.equal(st.status, 'waiting_player', 'Board must ignore miss while waiting');

  // Next player starts when PLAYERBUTTON is received
  st = engine.handleInput('PLAYERBUTTON');
  assert.equal(st.status, 'playing', 'Status must return to playing on PLAYERBUTTON');
  assert.equal(st.actualplayer, 1, 'Turn must advance to Bob');
  assert.equal(st.playerlaunch, 1, 'Player launch reset to 1');

  // 2. Turn ends early on explicit PLAYERBUTTON press (e.g. after only 1 dart)
  engine.handleInput('S20');
  st = engine.handleInput('PLAYERBUTTON');
  assert.equal(st.status, 'waiting_player', 'Early PLAYERBUTTON must transition to waiting_player');
  assert.equal(st.actualplayer, 1, 'Still Bob while waiting');
  const earlyReleaseMsg = st.events.find(e => e.type === 'message' && e.text.includes('Retirez les flèches'));
  assert.ok(earlyReleaseMsg, 'Announcement must be emitted on early PLAYERBUTTON');
  assert.equal(earlyReleaseMsg.duration, 10000, 'Duration must be 10000 ms (10s timer)');

  // Next PLAYERBUTTON advances back to Alice (round 2)
  st = engine.handleInput('PLAYERBUTTON');
  assert.equal(st.status, 'playing');
  assert.equal(st.actualplayer, 0);
  assert.equal(st.actualround, 2);

  // 3. BACKUPBUTTON during waiting_player restores turn
  engine.handleInput('T20');
  engine.handleInput('T20');
  st = engine.handleInput('T20');
  assert.equal(st.status, 'waiting_player');

  st = engine.handleInput('BACKUPBUTTON');
  assert.equal(st.status, 'playing', 'BACKUPBUTTON must cancel waiting_player and resume turn');
  assert.equal(st.actualplayer, 0, 'Must still be Alice');
  assert.equal(st.playerlaunch, 1, 'Launch counter reset');

  // 4. Solo game (1 player) with 10s timer
  const soloEngine = new MatchEngine(config, scores);
  soloEngine.startMatch({
    gameId: 'Ho_One',
    players: ['SoloPlayer'],
    options: { startingat: 301, double_out: false }
  });

  soloEngine.handleInput('T20');
  soloEngine.handleInput('T20');
  let soloSt = soloEngine.handleInput('T20');
  assert.equal(soloSt.status, 'waiting_player', 'Solo game must enter waiting_player with 10s timer');
  const soloMsg = soloSt.events.find(e => e.type === 'message' && e.text.includes('Retirez les flèches'));
  assert.ok(soloMsg);
  assert.equal(soloMsg.duration, 10000);

  soloSt = soloEngine.handleInput('PLAYERBUTTON');
  assert.equal(soloSt.status, 'playing');
  assert.equal(soloSt.actualround, 2);
  assert.equal(soloSt.actualplayer, 0);
});

test('MatchEngine tracks lastHit sequence ID for frontend hit animations', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);
  engine.startMatch({
    gameId: 'Ho_One',
    players: ['TestPlayer'],
    options: { startingat: 301 }
  });

  let st = engine.handleInput('T20');
  assert.ok(st.lastHit);
  assert.equal(st.lastHit.key, 'T20');
  assert.equal(typeof st.lastHit.id, 'number');
  const firstId = st.lastHit.id;

  st = engine.handleInput('S17');
  assert.equal(st.lastHit.key, 'S17');
  assert.equal(st.lastHit.id, firstId + 1);

  st = engine.handleInput('MISSDART');
  assert.equal(st.lastHit.key, 'MISSDART');
  assert.equal(st.lastHit.id, firstId + 2);
});

test('Fail sound and BUST announcement triggers properly on Bust (X01) and Zapped (321 Zlip)', () => {
  const config = new CConfig();
  const scores = new CScores(config);

  // 1. Bust in Ho_One (501)
  const engineX01 = new MatchEngine(config, scores);
  engineX01.startMatch({
    gameId: 'Ho_One',
    players: ['PlayerA'],
    options: { startingat: 301, double_out: true }
  });

  // T20 x 5 = 300 pts. Reste: 1 pt. In double_out, remaining 1 is an immediate bust!
  engineX01.handleInput('T20');
  engineX01.handleInput('T20');
  engineX01.handleInput('T20');
  engineX01.handleInput('PLAYERBUTTON'); // change round
  engineX01.handleInput('T20');
  const bustSt = engineX01.handleInput('T20');

  const failSound = bustSt.events.find(e => e.type === 'sound' && e.name === 'fail');
  assert.ok(failSound, 'Bust must emit fail sound');
  const bustMsg = bustSt.events.find(e => e.type === 'message' && e.text.includes('BUST'));
  assert.ok(bustMsg, 'Bust must emit BUST announcement');
  assert.ok(bustMsg.text.includes('Retirez les flèches'), 'Bust must include release darts reminder');
  assert.equal(bustMsg.duration, 10000, 'Bust announcement must have releasedartstime duration');

  // 2. Zapped in 321 Zlip
  const engineZlip = new MatchEngine(config, scores);
  engineZlip.startMatch({
    gameId: '321_Zlip',
    players: ['Player1', 'Player2'],
    options: {}
  });

  // Player 1 throws 3 darts (or ends early) and changes to Player 2
  engineZlip.handleInput('S20');
  engineZlip.handleInput('PLAYERBUTTON'); // ends turn -> waiting_player
  engineZlip.handleInput('PLAYERBUTTON'); // validates next player -> playing (actualplayer: 1)

  // Player 2 hits S20 -> 20 pts -> Zips Player 1 back to 0!
  const zlipSt = engineZlip.handleInput('S20');
  const zlipFailSound = zlipSt.events.find(e => e.type === 'sound' && e.name === 'fail');
  assert.ok(zlipFailSound, 'Zapping an opponent must emit fail sound');
  assert.equal(zlipSt.players[0].score, 0, 'Player 1 must be reset to 0 pts');
});

test('Companion and Showcase availability: 404 in prod mode, 200 and functional in dev mode', async () => {
  const config = new CConfig();
  config.SetValue('SectionAdvanced', 'noserial', true);

  // 1. Production Mode (default, isDev: false)
  const prodApp = createDartOTronServer({ config, isDev: false });
  await prodApp.start(0, '127.0.0.1');
  const prodBaseUrl = `http://127.0.0.1:${prodApp.server.address().port}`;

  try {
    const bootRes = await fetch(`${prodBaseUrl}/api/bootstrap`);
    assert.equal(bootRes.status, 200);
    const bootData = await bootRes.json();
    assert.equal(bootData.isDev, false);
    assert.ok(bootData.companionUrl && bootData.companionUrl.includes('/companion'), 'companionUrl must be in bootstrap');

    const getSimRes = await fetch(`${prodBaseUrl}/simulator`);
    assert.equal(getSimRes.status, 404, '/simulator must return 404 in production mode');

    const getSimFileRes = await fetch(`${prodBaseUrl}/simulator/simulator.js`);
    assert.equal(getSimFileRes.status, 404, '/simulator/* files must return 404 in production mode');

    const getCompRes = await fetch(`${prodBaseUrl}/companion`);
    assert.equal(getCompRes.status, 200, '/companion must return 200 in production mode');

    const getCompJsRes = await fetch(`${prodBaseUrl}/companion/companion.js`);
    assert.equal(getCompJsRes.status, 200, '/companion/companion.js must return 200 in production mode');

    const getShowcaseRes = await fetch(`${prodBaseUrl}/showcase`);
    assert.equal(getShowcaseRes.status, 404, '/showcase must return 404 in production mode');

    const postSim = await fetch(`${prodBaseUrl}/api/serial/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'T20' })
    });
    assert.equal(postSim.status, 404, '/api/serial/simulate must return 404 in production mode');
  } finally {
    await prodApp.stop();
  }

  // 2. Dev Mode (isDev: true, as started with yarn dev / --dev)
  const devApp = createDartOTronServer({ config, isDev: true });
  await devApp.start(0, '127.0.0.1');
  const devBaseUrl = `http://127.0.0.1:${devApp.server.address().port}`;

  try {
    const bootRes = await fetch(`${devBaseUrl}/api/bootstrap`);
    assert.equal(bootRes.status, 200);
    const bootData = await bootRes.json();
    assert.equal(bootData.isDev, true);

    const getSimRes = await fetch(`${devBaseUrl}/simulator`);
    assert.equal(getSimRes.status, 200);
    const htmlText = await getSimRes.text();
    assert.ok(htmlText.includes('Simulateur Cible Arduino'));
    assert.ok(htmlText.includes('interactive-dartboard'));

    const getCompResDev = await fetch(`${devBaseUrl}/companion`);
    assert.equal(getCompResDev.status, 200);
    const compDevHtml = await getCompResDev.text();
    assert.ok(compDevHtml.includes('companion-view-lobby'));

    const getShowcaseRes = await fetch(`${devBaseUrl}/showcase`);
    assert.equal(getShowcaseRes.status, 200);
    const scHtmlText = await getShowcaseRes.text();
    assert.ok(scHtmlText.includes('DartOTron ATOMIC SHOWCASE'));

    const getShowcaseJsRes = await fetch(`${devBaseUrl}/showcase/showcase.js`);
    assert.equal(getShowcaseJsRes.status, 200);

    // Start a match in Ho_One (301) and simulate hit
    devApp.engine.startMatch({
      gameId: 'Ho_One',
      players: ['SimPlayer'],
      options: { startingat: 301 }
    });

    const postRes1 = await fetch(`${devBaseUrl}/api/serial/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'T20' })
    });
    assert.equal(postRes1.status, 200);
    const data1 = await postRes1.json();
    assert.equal(data1.ok, true);

    const state = devApp.engine.getStateAndFlushEvents();
    assert.equal(state.players[0].score, 241);
    assert.equal(state.lastHit.key, 'T20');
  } finally {
    await devApp.stop();
  }
});

test('V2 Relational Storage: In-memory hits buffering, discarded on interruption, committed on completion', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  // 1. Démarrer une partie qui sera interrompue (GAMEBUTTON)
  engine.startMatch({
    gameId: 'Ho_One',
    players: ['TestPlayer1', 'TestPlayer2'],
    options: { startingat: 301 }
  });

  engine.handleInput('T20');
  engine.handleInput('S20');
  assert.equal(engine.matchHitsBuffer.length, 2);

  // Les impacts ne doivent pas être en base de données tant que la partie n'est pas terminée
  const db = scores.getDb();
  let preHitsCount = 0;
  try {
    const row = db.prepare("SELECT COUNT(*) as cnt FROM dart_hits WHERE hit IN ('T20', 'S20')").get();
    preHitsCount = row?.cnt || 0;
  } finally {
    db.close();
  }

  // Interruption de la partie
  engine.handleInput('GAMEBUTTON');
  assert.equal(engine.status, 'finished');
  assert.equal(engine.endReason, 'interrupted');

  // Vérifier qu'aucun impact n'a été versé dans dart_hits
  const db2 = scores.getDb();
  try {
    const row = db2.prepare("SELECT COUNT(*) as cnt FROM dart_hits WHERE hit IN ('T20', 'S20')").get();
    assert.equal(row?.cnt, preHitsCount, 'Aucun impact ne doit être persisté pour une partie interrompue');
  } finally {
    db2.close();
  }

  // 2. Démarrer une nouvelle partie et aller jusqu'à la victoire
  engine.startMatch({
    gameId: 'Ho_One',
    players: ['WinnerPlayer'],
    options: { startingat: 301 }
  });

  engine.handleInput('T20'); // 60 -> 241
  engine.handleInput('T20'); // 60 -> 181
  engine.handleInput('T20'); // 60 -> 121
  assert.equal(engine.matchHitsBuffer.length, 3);

  // Terminer la partie (victoire)
  engine.finishMatch('victory', 0);

  // Vérifier le versement en base de données
  const db3 = scores.getDb();
  try {
    const winner = db3.prepare('SELECT * FROM players WHERE name = ?').get('WinnerPlayer');
    assert.ok(winner, 'Le joueur doit exister dans players');
    assert.ok(winner.wins >= 1, 'Les victoires doivent être incrémentées');

    const hits = db3.prepare('SELECT * FROM dart_hits WHERE player_id = ?').all(winner.id);
    assert.equal(hits.length, 3, 'Les 3 impacts doivent être versés dans dart_hits');
    assert.equal(hits[0].hit, 'T20');
    assert.equal(hits[0].score_value, 60);

    const part = db3.prepare('SELECT * FROM game_participants WHERE player_id = ?').get(winner.id);
    assert.ok(part, 'Le participant doit être enregistré');
    assert.equal(part.rank, 1);
  } finally {
    db3.close();
  }
});

test('V2 Relational Storage: Undo rewinds in-memory hits buffer correctly', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Practice',
    players: ['UndoTester'],
    options: {}
  });

  engine.handleInput('T20');
  engine.handleInput('T19');
  assert.equal(engine.matchHitsBuffer.length, 2);

  // Appui sur BACKUPBUTTON
  engine.handleInput('BACKUPBUTTON');
  assert.equal(engine.matchHitsBuffer.length, 0, 'Les impacts du tour annulé doivent être retirés du buffer mémoire');
});

test('V2 Relational Storage: Dynamic records architecture (definition catalogue, add, get, delete record)', () => {
  const config = new CConfig();
  const scores = new CScores(config);

  // Création d'une nouvelle définition de record personnalisée pour un jeu
  scores.AddRecordDefinition({
    id: 'test_century_break',
    game_name: 'Ho_One',
    record_type: 'break',
    name: 'Century Break (100+)',
    unit: 'pts',
    sort_order: 'DESC',
    is_highlight: 1
  });

  const defs = scores.GetRecordDefinitions('Ho_One');
  assert.ok(defs.some(d => d.id === 'test_century_break'));

  // Ajout d'un record
  const p = scores.AddPlayer('RecordChampion');
  scores.AddRecord({
    game_name: 'Ho_One',
    record_type: 'test_century_break',
    player_id: p.id,
    value: 140,
    details: 'T20 T20 D10'
  });

  const recs = scores.GetRecords({ gameName: 'Ho_One', recordType: 'test_century_break' });
  assert.equal(recs.length, 1);
  assert.equal(recs[0].value, 140);
  assert.equal(recs[0].player_name, 'RecordChampion');

  // Suppression du record
  scores.DeleteRecord(recs[0].id);
  const recsAfter = scores.GetRecords({ gameName: 'Ho_One', recordType: 'test_century_break' });
  assert.equal(recsAfter.length, 0);

  // Nettoyage définition
  scores.DeleteRecordDefinition('test_century_break');
  const defsAfter = scores.GetRecordDefinitions('Ho_One');
  assert.ok(!defsAfter.some(d => d.id === 'test_century_break'));
});

test('V2 Relational Storage: Lobby state persistence in SQLite with player IDs', () => {
  const config = new CConfig();
  const scores = new CScores(config);

  const p1 = scores.AddPlayer('LobbyAlpha');
  const p2 = scores.AddPlayer('LobbyBeta');

  scores.SaveLobbyState({
    selectedGame: '321_Zlip',
    playerNames: ['LobbyBeta', 'LobbyAlpha']
  });

  const lobby = scores.GetLobbyState();
  assert.equal(lobby.selectedGame, '321_Zlip');
  assert.deepEqual(lobby.activePlayers, ['LobbyBeta', 'LobbyAlpha']);
  assert.deepEqual(lobby.activePlayerIds, [p2.id, p1.id]);
});

test('Pattern-based custom records: Suite consécutive, Shanghai, Hat-trick et protection des records système', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  // 1. Protection des records système : suppression interdite
  assert.throws(() => {
    scores.DeleteRecordDefinition('ho_one_ppr');
  }, /Impossible de supprimer un type de record système/);

  // 2. Création de deux records personnalisés avec conditions de volée
  scores.AddRecordDefinition({
    id: 'test_suite_consecutive',
    game_name: 'Ho_One',
    record_type: 'test_suite_consecutive',
    name: 'Suite Consécutive',
    unit: 'fois',
    sort_order: 'DESC',
    is_highlight: 1,
    is_system: 0,
    pattern: 'consecutive_suite'
  });

  scores.AddRecordDefinition({
    id: 'test_shanghai_custom',
    game_name: 'Ho_One',
    record_type: 'test_shanghai_custom',
    name: 'Shanghai (S+D+T)',
    unit: 'fois',
    sort_order: 'DESC',
    is_highlight: 1,
    is_system: 0,
    pattern: 'shanghai'
  });

  engine.startMatch({
    gameId: 'Ho_One',
    players: ['PatternAce'],
    options: { startingat: 501 }
  });

  // Tour 1 : Réaliser une suite consécutive (S18, S19, S20)
  engine.handleInput('S18');
  engine.handleInput('S19');
  const st1 = engine.handleInput('S20');

  const suiteMsg = st1.events.find(e => e.type === 'message' && e.text.includes('SUITE CONSÉCUTIVE'));
  assert.ok(suiteMsg, 'Devrait annoncer la réussite de la Suite Consécutive');
  assert.ok(engine.matchRecordsBuffer.some(r => r.recordType === 'test_suite_consecutive'));

  // Fin du tour 1 et passage au tour 2
  engine.handleInput('PLAYERBUTTON');

  // Tour 2 : Réaliser un Shanghai sur le 20 (S20, D20, T20)
  engine.handleInput('S20');
  engine.handleInput('D20');
  const st2 = engine.handleInput('T20');

  const shanghaiMsg = st2.events.find(e => e.type === 'message' && e.text.includes('SHANGHAI'));
  assert.ok(shanghaiMsg, 'Devrait annoncer la réussite du Shanghai');
  assert.ok(engine.matchRecordsBuffer.some(r => r.recordType === 'test_shanghai_custom'));

  // Terminer le match
  engine.finishMatch('victory', 0);

  // Vérifier la persistance dans la table unifiée records
  const suiteRecords = scores.GetRecords({ gameName: 'Ho_One', recordType: 'test_suite_consecutive' });
  assert.equal(suiteRecords.length, 1);
  assert.equal(suiteRecords[0].player_name, 'PatternAce');

  const shanghaiRecords = scores.GetRecords({ gameName: 'Ho_One', recordType: 'test_shanghai_custom' });
  assert.equal(shanghaiRecords.length, 1);
  assert.equal(shanghaiRecords[0].player_name, 'PatternAce');

  // Nettoyage des records personnalisés
  scores.DeleteRecordDefinition('test_suite_consecutive');
  scores.DeleteRecordDefinition('test_shanghai_custom');
});

test('Automatic Retro-analysis (Backfill): scans dart_hits and attributes new pattern records to past games', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  // 1. Jouer une partie SANS que le record de Hat-Trick ne soit encore créé
  engine.startMatch({
    gameId: 'Ho_One',
    players: ['HistoricalShooter'],
    options: { startingat: 501 }
  });

  // HistoricalShooter réussit 3 Bulls (DB, SB, DB) au tour 1
  engine.handleInput('DB');
  engine.handleInput('SB');
  engine.handleInput('DB');

  // Fin du match (victoire) -> impacts versés dans dart_hits
  engine.finishMatch('victory', 0);

  // Vérifier qu'aucun record "retro_hat_trick" n'existe encore
  const recsBefore = scores.GetRecords({ recordType: 'retro_hat_trick' });
  assert.equal(recsBefore.length, 0);

  // 2. Création ultérieure d'un type de record Hat-Trick avec déclenchement de la rétro-analyse
  scores.AddRecordDefinition({
    id: 'retro_hat_trick',
    game_name: '*',
    record_type: 'retro_hat_trick',
    name: 'Hat Trick (3 Bulls)',
    unit: 'fois',
    sort_order: 'DESC',
    is_highlight: 1,
    is_system: 0,
    pattern: 'hat_trick'
  });

  const count = scores.BackfillRecord('retro_hat_trick');
  assert.ok(count >= 1, 'Devrait avoir trouvé au moins 1 accomplissement rétroactif');

  // 3. Vérifier que le joueur historique détient bien le record maintenant
  const recsAfter = scores.GetRecords({ recordType: 'retro_hat_trick' });
  assert.ok(recsAfter.length >= 1);
  const shooterRecord = recsAfter.find(r => r.player_name === 'HistoricalShooter');
  assert.ok(shooterRecord, 'HistoricalShooter doit avoir reçu son record de manière rétroactive');
  assert.equal(shooterRecord.details, 'DB, SB, DB');

  // Une deuxième rétro-analyse ne doit pas créer de doublons
  const count2 = scores.BackfillRecord('retro_hat_trick');
  assert.equal(count2, 0, 'Ne doit pas dupliquer les accomplissements déjà enregistrés');

  scores.DeleteRecordDefinition('retro_hat_trick');
});

test('Fresh database creation triggers first creation flag and consumes cleanly', () => {
  const tmpDir = path.join(os.tmpdir(), 'dartotron_test_init_' + Date.now());
  
  try {
    const scores = new CScores({ pathDir: tmpDir });

    assert.equal(scores.isFirstCreation, true, 'isFirstCreation must be true on brand new database');
    assert.equal(scores.consumeFirstCreationFlag(), true, 'consumeFirstCreationFlag must return true the first time');
    assert.equal(scores.consumeFirstCreationFlag(), false, 'consumeFirstCreationFlag must return false once consumed');
    assert.equal(scores.isFirstCreation, false);

    // Initialisation suivante sur même dossier
    const scores2 = new CScores({ pathDir: tmpDir });
    assert.equal(scores2.isFirstCreation, false, 'isFirstCreation must be false on existing database');
    assert.equal(scores2.consumeFirstCreationFlag(), false);
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});

test('Revised System Records Catalogue: Validates new schema, purge of obsolete records, and new victory metrics', () => {
  const tmpDir = path.join(os.tmpdir(), 'dartotron_test_revised_records_' + Date.now());

  try {
    const config = new CConfig();
    const scores = new CScores({ pathDir: tmpDir });
    const defs = scores.GetRecordDefinitions();
    const defIds = defs.map(d => d.id);

    // 1. Vérifier la présence des nouveaux records
    assert.ok(defIds.includes('ho_one_ppr'), 'ho_one_ppr must be present');
    assert.ok(defIds.includes('ho_one_best_finish'), 'ho_one_best_finish must be present');
    assert.ok(defIds.includes('ho_one_least_darts'), 'ho_one_least_darts must be present');
    assert.ok(defIds.includes('cricket_mpr'), 'cricket_mpr must be present');
    assert.ok(defIds.includes('cricket_least_rounds'), 'cricket_least_rounds must be present');
    assert.ok(defIds.includes('321_zlips'), '321_zlips must be present');
    assert.ok(defIds.includes('321_zlipped'), '321_zlipped must be present');
    assert.ok(defIds.includes('by_fives_min_rounds'), 'by_fives_min_rounds must be present');
    assert.ok(defIds.includes('chimay_bleu'), 'chimay_bleu must be present');
    assert.ok(defIds.includes('best_round_180'), 'best_round_180 must be present');
    assert.ok(defIds.includes('hat_trick'), 'hat_trick must be present');
    assert.ok(defIds.includes('shanghai'), 'shanghai must be present');

    // 2. Vérifier l'absence des anciens records obsolètes
    const obsoleteIds = [
      'ho_one_ppd',
      'cricket_hits',
      'cricket_giveout',
      '321_ppr',
      'by_fives_score',
      'kinito_ppr',
      'practice_hits',
      'practice_mpr'
    ];
    for (const obs of obsoleteIds) {
      assert.ok(!defIds.includes(obs), `Obsolete record ${obs} must not be present`);
    }

    // 3. Jouer un match de Ho_One (301 simple) et vérifier la création de Best Finish et Least Darts
    const engine = new MatchEngine(config, scores);
    engine.startMatch({
      gameId: 'Ho_One',
      players: ['ChampionPlayer'],
      options: { startingat: 301, double_out: false, master_out: false }
    });

    // Tour 1: T20, T20, T20 = 180 (reste 121)
    engine.handleInput('T20');
    engine.handleInput('T20');
    engine.handleInput('T20');
    engine.handleInput('PLAYERBUTTON'); // change round
    // Tour 2: T20 (reste 61), T19 (reste 4), D2 (gagné ! Checkout = 121)
    engine.handleInput('T20');
    engine.handleInput('T19');
    const finalSt = engine.handleInput('D2');
    assert.equal(finalSt.status, 'finished');

    const db = scores.getDb();
    const finishRow = db.prepare(`
      SELECT * FROM records
      WHERE record_type = 'ho_one_301_best_finish' OR record_type = 'ho_one_best_finish' OR record_type = 'Best Finish'
    `).get();
    assert.ok(finishRow, 'Record Best Finish must be inserted');
    assert.equal(finishRow.value, 121, 'Checkout should be 121 points');
    assert.equal(finishRow.game_variant, '301', 'Variant should be 301');

    const leastDartsRow = db.prepare(`
      SELECT * FROM records
      WHERE record_type = 'ho_one_301_least_darts' OR record_type = 'ho_one_least_darts' OR record_type = 'Least Darts'
    `).get();
    assert.ok(leastDartsRow, 'Record Least Darts must be inserted');
    assert.equal(leastDartsRow.value, 6, 'Should have won in 6 darts');
    assert.equal(leastDartsRow.game_variant, '301', 'Variant should be 301');
    db.close();
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});

test('Preferences & Custom Match Result Records: Supports favorite triples/games and defeat records', () => {
  const tmpDir = path.join(os.tmpdir(), 'dartotron_test_pref_defeat_' + Date.now());

  try {
    const config = new CConfig();
    const scores = new CScores({ pathDir: tmpDir });

    // 1. Joueurs
    const p1 = scores.AddPlayer('Alice');
    const p2 = scores.AddPlayer('Bob');

    // 2. Créer une définition de record "Pire Défaite au Cricket" (match_result, loss, total_points, DESC)
    scores.AddRecordDefinition({
      id: 'cricket_worst_defeat',
      game_name: 'Cricket',
      name: 'Pire Défaite Cut-Throat',
      unit: 'pts',
      sort_order: 'DESC',
      is_highlight: 1,
      is_system: 0,
      calc_type: 'match_result',
      match_condition: 'loss',
      match_metric: 'total_points'
    });

    // 3. Simuler une partie terminée où Bob perd lourdement (450 pts) face à Alice (120 pts)
    scores.RecordCompletedMatch({
      gameName: 'Cricket',
      gameOptions: 'cutthroat=1|',
      nbPlayers: 2,
      winnerName: 'Alice',
      startedAt: new Date(Date.now() - 600000).toISOString(),
      endedAt: new Date().toISOString(),
      durationSeconds: 600,
      participants: [
        { name: 'Alice', rank: 1, totalPoints: 120, dartsThrown: 30 },
        { name: 'Bob', rank: 2, totalPoints: 450, dartsThrown: 32 }
      ],
      hits: [
        { playerName: 'Alice', hit: 'T20', roundNumber: 1, dartNumber: 1 },
        { playerName: 'Alice', hit: 'T20', roundNumber: 1, dartNumber: 2 },
        { playerName: 'Alice', hit: 'T19', roundNumber: 1, dartNumber: 3 },
        { playerName: 'Bob', hit: 'T19', roundNumber: 1, dartNumber: 1 },
        { playerName: 'Bob', hit: 'T19', roundNumber: 1, dartNumber: 2 },
        { playerName: 'Bob', hit: 'T19', roundNumber: 1, dartNumber: 3 }
      ],
      records: []
    });

    // Vérifier que le record de défaite a bien été attribué à Bob
    const defeats = scores.GetRecords({ recordType: 'cricket_worst_defeat' });
    assert.equal(defeats.length, 1, 'Bob should have 1 defeat record');
    assert.equal(defeats[0].player_name, 'Bob');
    assert.equal(defeats[0].value, 450, 'Defeat score must be 450 pts');

    // 4. Vérifier les préférences de joueur
    const profAlice = scores.GetPlayerProfile('Alice');
    assert.equal(profAlice.favoriteTriple?.hit, 'T20');
    assert.equal(profAlice.favoriteTriple?.count, 2);
    assert.equal(profAlice.favoriteGame, 'Cricket');

    const profBob = scores.GetPlayerProfile('Bob');
    assert.equal(profBob.favoriteTriple?.hit, 'T19');
    assert.equal(profBob.favoriteTriple?.count, 3);
    assert.equal(profBob.favoriteGame, 'Cricket');

    // 5. Vérifier que le Hall of Fame retourne bien le record custom mais PAS les préférences système
    const hof = scores.GetHallOfFame();
    const defeatCard = hof.find(c => c.id === 'cricket_worst_defeat');
    assert.ok(defeatCard, 'Hall of Fame must contain cricket_worst_defeat');
    assert.equal(defeatCard.records[0].playername, 'Bob');
    assert.equal(defeatCard.records[0].score, 450);

    const favTripleCard = hof.find(c => c.id === 'fav_triple');
    assert.equal(favTripleCard, undefined, 'Hall of Fame must NOT contain fav_triple (reserved for player stats)');

    // 6. Vérifier que playerRecords est présent et complet pour le rendu récursif
    assert.ok(Array.isArray(profBob.playerRecords), 'playerRecords must be an array');
    const bobDefeat = profBob.playerRecords.find(r => r.id === 'cricket_worst_defeat');
    assert.ok(bobDefeat, 'Bob must have cricket_worst_defeat in playerRecords');
    assert.equal(bobDefeat.max_val, 450);
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});

test('Ho_One option equal: P1 finishes in 4 darts, P2 fails to equalize -> P1 wins', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Ho_One',
    players: ['P1', 'P2'],
    options: { startingat: 101, double_out: false, equal: 'True' }
  });

  // Round 1 - P1: T20 (60) + S20 (20) + S20 (20) = 100 pts -> 1 pt remaining
  engine.handleInput('T20');
  engine.handleInput('S20');
  let st = engine.handleInput('S20');
  assert.equal(st.status, 'waiting_player');
  assert.equal(st.players[0].score, 1);

  // Round 1 - P2: S20 + S20 + S20 = 60 pts -> 41 pts remaining
  st = engine.handleInput('PLAYERBUTTON');
  assert.equal(st.actualplayer, 1);
  engine.handleInput('S20');
  engine.handleInput('S20');
  st = engine.handleInput('S20');
  assert.equal(st.status, 'waiting_player');
  assert.equal(st.players[1].score, 41);

  // Round 2 - P1: S1 (1 pt) -> 0 pts ! (Turn 2, dart 1 -> 4 darts total)
  st = engine.handleInput('PLAYERBUTTON');
  assert.equal(st.actualplayer, 0);
  st = engine.handleInput('S1');
  assert.equal(st.players[0].score, 0);
  // Match must NOT finish yet because P2 hasn't thrown their 4th dart
  assert.equal(st.status, 'waiting_player');

  // Round 2 - P2: Needs to reach 0 in 1 dart (4 - 3 = 1 dart allowed)
  st = engine.handleInput('PLAYERBUTTON');
  assert.equal(st.actualplayer, 1);
  assert.equal(st.remainingDarts, 1);

  // P2 throws S20 (doesn't reach 0) -> turn terminates because allowed quota reached
  st = engine.handleInput('S20');
  assert.equal(st.status, 'finished');
  assert.equal(st.endReason, 'victory');
  assert.equal(st.winner.PlayerName, 'P1');
});

test('Ho_One option equal: P1 and P2 both finish in 4 darts -> match nul (draw)', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Ho_One',
    players: ['P1', 'P2'],
    options: { startingat: 101, double_out: false, equal: 'True' }
  });

  // Round 1 - P1: 100 pts -> 1 pt
  engine.handleInput('T20');
  engine.handleInput('S20');
  engine.handleInput('S20');
  engine.handleInput('PLAYERBUTTON');

  // Round 1 - P2: 100 pts -> 1 pt
  engine.handleInput('T20');
  engine.handleInput('S20');
  engine.handleInput('S20');
  engine.handleInput('PLAYERBUTTON');

  // Round 2 - P1: S1 -> finishes in 4 darts
  let st = engine.handleInput('S1');
  assert.equal(st.status, 'waiting_player');

  // Round 2 - P2: S1 -> finishes in 4 darts too !
  engine.handleInput('PLAYERBUTTON');
  st = engine.handleInput('S1');
  assert.equal(st.status, 'finished');
  assert.equal(st.endReason, 'draw');
  assert.equal(st.winner, null);
});

test('Ho_One option equal: P1 finishes in 6 darts, P2 finishes in 4 darts -> P2 wins', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Ho_One',
    players: ['P1', 'P2'],
    options: { startingat: 101, double_out: false, equal: 'True' }
  });

  // Round 1 - P1: S20, S20, S20 (60 pts) -> 41 pts
  engine.handleInput('S20');
  engine.handleInput('S20');
  engine.handleInput('S20');
  engine.handleInput('PLAYERBUTTON');

  // Round 1 - P2: T20, S20, S20 (100 pts) -> 1 pt
  engine.handleInput('T20');
  engine.handleInput('S20');
  engine.handleInput('S20');
  engine.handleInput('PLAYERBUTTON');

  // Round 2 - P1: S20 (21 pts), S20 (1 pt), S1 (reaches 0 on dart 3 -> 6 darts total)
  engine.handleInput('S20');
  engine.handleInput('S20');
  let st = engine.handleInput('S1');
  assert.equal(st.status, 'waiting_player');
  assert.equal(st.players[0].score, 0);

  // Round 2 - P2: S1 on dart 1 (reaches 0 on dart 1 -> 3 + 1 = 4 darts total)
  engine.handleInput('PLAYERBUTTON');
  st = engine.handleInput('S1');
  assert.equal(st.status, 'finished');
  assert.equal(st.endReason, 'victory');
  assert.equal(st.winner.PlayerName, 'P2');
});

test('Ho_One option equal: solo match finishes immediately on reach 0', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Ho_One',
    players: ['SoloPlayer'],
    options: { startingat: 101, double_out: false, equal: 'True' }
  });

  // Round 1 - Solo: 100 pts -> 1 pt
  engine.handleInput('T20');
  engine.handleInput('S20');
  engine.handleInput('S20');
  engine.handleInput('PLAYERBUTTON');

  // Round 2 - Solo: finishes on dart 1 -> instant victory (no waiting for non-existent players)
  const st = engine.handleInput('S1');
  assert.equal(st.status, 'finished');
  assert.equal(st.endReason, 'victory');
  assert.equal(st.winner.PlayerName, 'SoloPlayer');
});

test('Records segregation per variant: Ho_One (301 vs 501)', () => {
  const tmpDir = path.join(os.tmpdir(), 'dartotron_test_variants_' + Date.now());

  try {
    const config = new CConfig();
    const scores = new CScores({ pathDir: tmpDir });
    const engine = new MatchEngine(config, scores);

    // 1. Partie 301 terminée en 6 fléchettes par Quick301 (finish 121)
    engine.startMatch({
      gameId: 'Ho_One',
      players: ['Quick301'],
      options: { startingat: 301, double_out: false }
    });
    // Tour 1 : 180 (reste 121)
    engine.handleInput('T20');
    engine.handleInput('T20');
    engine.handleInput('T20');
    engine.handleInput('PLAYERBUTTON');
    // Tour 2 : T20 (61), T19 (4), D2 (0) -> finish 121 en 6 fléchettes
    engine.handleInput('T20');
    engine.handleInput('T19');
    let st = engine.handleInput('D2');
    assert.equal(st.status, 'finished');

    // 2. Partie 501 terminée en 9 fléchettes par Steady501 (finish 141)
    engine.startMatch({
      gameId: 'Ho_One',
      players: ['Steady501'],
      options: { startingat: 501, double_out: false }
    });
    // Tour 1 : 180 (reste 321)
    engine.handleInput('T20');
    engine.handleInput('T20');
    engine.handleInput('T20');
    engine.handleInput('PLAYERBUTTON');
    // Tour 2 : 180 (reste 141)
    engine.handleInput('T20');
    engine.handleInput('T20');
    engine.handleInput('T20');
    engine.handleInput('PLAYERBUTTON');
    // Tour 3 : T20 (81), T19 (24), D12 (0) -> finish 141 en 9 fléchettes
    engine.handleInput('T20');
    engine.handleInput('T19');
    st = engine.handleInput('D12');
    assert.equal(st.status, 'finished');

    // 3. Vérification du classement 301 (Least Darts)
    const table301 = scores.GetScoreTable('Least Darts', 'ASC', false, 'Ho_One', { startingat: 301 });
    assert.ok(table301.length >= 1, 'Table 301 must have records');
    assert.equal(table301[0].playername, 'Quick301');
    assert.equal(table301[0].score, 6);
    assert.ok(!table301.some(r => r.playername === 'Steady501'), 'Steady501 (501) must NOT appear in 301 records');

    // 4. Vérification du classement 501 (Least Darts)
    const table501 = scores.GetScoreTable('Least Darts', 'ASC', false, 'Ho_One', { startingat: 501 });
    assert.ok(table501.length >= 1, 'Table 501 must have records');
    assert.equal(table501[0].playername, 'Steady501');
    assert.equal(table501[0].score, 9);
    assert.ok(!table501.some(r => r.playername === 'Quick301'), 'Quick301 (301) must NOT appear in 501 records');

    // 5. Vérification du Meilleur Finish 501 (141) vs 301 (121)
    const finish501 = scores.GetScoreTable('Best Finish', 'DESC', false, 'Ho_One', { startingat: 501 });
    assert.equal(finish501[0].playername, 'Steady501');
    assert.equal(finish501[0].score, 141);

    const finish301 = scores.GetScoreTable('Best Finish', 'DESC', false, 'Ho_One', { startingat: 301 });
    assert.equal(finish301[0].playername, 'Quick301');
    assert.equal(finish301[0].score, 121);

    // 6. Vérification du Hall of Fame avec sections et filtres
    const hof = scores.GetHallOfFame({ hoOneVariant: '301' });
    assert.ok(hof.sections, 'Hall of Fame must expose sections');
    assert.equal(hof.sections.ho_one.activeVariant, '301');
    const leastDartsCard = hof.sections.ho_one.categories.find(c => c.id.includes('least_darts'));
    assert.ok(leastDartsCard, 'Card Least Darts must exist for 301');
    assert.equal(leastDartsCard.records[0].playername, 'Quick301');
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
});

test('Ho_One live PPR calculation: TotalPoints / actualround during game, 3-dart average at match finish', () => {
  const config = new CConfig();
  const scores = new CScores();
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Ho_One',
    players: ['PPRPlayer'],
    options: { startingat: 301, double_out: false }
  });

  // Tour 1, fléchette 1 : 17 pts (S17)
  let st = engine.handleInput('S17');
  assert.equal(st.players[0].TotalPoints, 17);
  assert.equal(st.players[0].dartsthrown, 1);
  // PPD = 17.0, PPR = 17.0 (et non 51.0 !)
  assert.equal(st.players[0].LSTColVal[5][0], 17.0);
  assert.equal(st.players[0].LSTColVal[6][0], 17.0);

  // Tour 1, fléchette 2 : 20 pts (S20) -> Total 37 pts
  st = engine.handleInput('S20');
  assert.equal(st.players[0].TotalPoints, 37);
  assert.equal(st.players[0].dartsthrown, 2);
  assert.equal(st.players[0].LSTColVal[5][0], 18.5); // 37 / 2
  assert.equal(st.players[0].LSTColVal[6][0], 37.0); // 37 / 1

  // Tour 1, fléchette 3 : 20 pts (S20) -> Total 57 pts
  st = engine.handleInput('S20');
  assert.equal(st.players[0].TotalPoints, 57);
  assert.equal(st.players[0].dartsthrown, 3);
  assert.equal(st.players[0].LSTColVal[5][0], 19.0); // 57 / 3
  assert.equal(st.players[0].LSTColVal[6][0], 57.0); // 57 / 1

  // Tour 2 : changement de tour
  engine.handleInput('PLAYERBUTTON');

  // Tour 2, fléchette 1 : 20 pts (S20) -> Total 77 pts, Tour 2
  st = engine.handleInput('S20');
  assert.equal(st.actualround, 2);
  assert.equal(st.players[0].TotalPoints, 77);
  assert.equal(st.players[0].dartsthrown, 4);
  assert.equal(st.players[0].LSTColVal[5][0], 19.3); // 77 / 4 = 19.25 -> 19.3
  assert.equal(st.players[0].LSTColVal[6][0], 38.5); // 77 / 2 = 38.5
});

test('SettingsController: syncRecordsVariantsWithLobby matches lobby variant selections', async () => {
  // Test de la logique de synchronisation SettingsController
  const { SettingsController } = await import('../public/js/modules/SettingsController.js');

  const mockApp = {
    customGameOptions: {
      Ho_One: { startingat: '301' }
    }
  };

  const ctrl = new SettingsController(mockApp);

  // Simulation environnement avec document mock minimal si non défini
  const prevDoc = global.document;
  const prevLocalStorage = global.localStorage;

  global.localStorage = {
    getItem(key) {
      if (key === 'dartotron_variant_Cricket') return 'cutthroat';
      return null;
    }
  };

  global.document = {
    querySelector(sel) {
      if (sel === 'game-card[game-id="Ho_One"]') {
        return { currentVariantId: '701' };
      }
      return null;
    }
  };

  try {
    const res = ctrl.syncRecordsVariantsWithLobby();
    assert.equal(res.ho_one, '701', 'Should use Ho_One card variant from DOM if present');
    assert.equal(res.cricket, 'cutthroat', 'Should use Cricket variant from localStorage if card not present');

    // Test fallback sur customGameOptions
    global.document = { querySelector: () => null };
    global.localStorage = { getItem: () => null };

    const res2 = ctrl.syncRecordsVariantsWithLobby();
    assert.equal(res2.ho_one, '301', 'Should fallback to customGameOptions.Ho_One.startingat');
    assert.equal(res2.cricket, 'standard', 'Should fallback to default standard for Cricket');
  } finally {
    global.document = prevDoc;
    global.localStorage = prevLocalStorage;
  }
});

test('GetPlayersStats: computes avgPPR & avg3DAllTime from variant-specific records and dart_hits fallback', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  scores.initDB();

  scores.AddPlayer('VariantPro');
  scores.AddPlayer('HitShooter');

  // 1. VariantPro enregistre un record PPR sous une variante spécifique (ho_one_501_ppr)
  scores.AddScore({
    gamename: 'Ho_One',
    gameoptions: { startingat: '501' },
    scorename: 'Points Per Round',
    score: '75.4',
    playername: 'VariantPro'
  });

  // 2. HitShooter n'a pas de record explicite mais a des lancers dans dart_hits (T20, T20, S20 = 140 pts)
  const gameId = scores.RecordCompletedMatch({
    gameName: 'Ho_One',
    gameOptions: { startingat: 301 },
    nbPlayers: 1,
    winnerName: 'HitShooter',
    participants: [{ name: 'HitShooter', rank: 1, totalPoints: 140, dartsThrown: 3 }],
    hits: [
      { playerName: 'HitShooter', hit: 'T20', scoreValue: 60, round: 1, dart: 1 },
      { playerName: 'HitShooter', hit: 'T20', scoreValue: 60, round: 1, dart: 2 },
      { playerName: 'HitShooter', hit: 'S20', scoreValue: 20, round: 1, dart: 3 }
    ],
    records: []
  });

  const stats = scores.GetPlayersStats(['VariantPro', 'HitShooter']);
  const proStat = stats.find(s => s.name === 'VariantPro');
  const hitStat = stats.find(s => s.name === 'HitShooter');

  assert.ok(proStat, 'VariantPro should exist in stats');
  assert.equal(proStat.avgPPR, 75.4, 'Should compute PPR from variant-specific record');
  assert.equal(proStat.avg3DAllTime, 75.4, 'Should compute 3D average from variant-specific record');

  assert.ok(hitStat, 'HitShooter should exist in stats');
  assert.equal(hitStat.avg3DAllTime, 140.0, 'Should fallback to dart_hits when no record exists');
  assert.equal(hitStat.avgPPR, 140.0);
});

test('MatchController: interrupted match bypasses finished view and routes directly to lobby', async () => {
  const { MatchController } = await import('../public/js/modules/MatchController.js');

  let switchedView = null;
  let lobbyStep = null;
  let notification = null;

  const mockApp = {
    audio: { playSound: () => {} },
    hideAnnouncement: () => {},
    switchView: (view) => { switchedView = view; },
    notify: (data) => { notification = data; },
    lobbyController: {
      goToLobbyStep: (step) => { lobbyStep = step; }
    }
  };

  const ctrl = new MatchController(mockApp);

  // Simulation état interrompu
  const interruptedState = {
    status: 'finished',
    endReason: 'interrupted',
    players: [{ PlayerName: 'P1' }]
  };

  const prevFetch = global.fetch;
  global.fetch = async () => ({ json: async () => ({}) });

  try {
    ctrl.applyMatchState(interruptedState);

    assert.equal(switchedView, 'view-lobby', 'Should switch directly to view-lobby');
    assert.equal(lobbyStep, 1, 'Should reset lobby to step 1');
    assert.ok(notification, 'Should display notification');
    assert.equal(notification.title, 'PARTIE INTERROMPUE');
  } finally {
    global.fetch = prevFetch;
  }
});

test('Records integrity: pipe-delimited options parsed properly and corrupted Chimay/least_darts cleaned up', async () => {
  const { parseGameOptions, getGameVariantId } = await import('../server/db/records.js');
  const config = new CConfig();
  const scores = new CScores(config);
  scores.initDB();

  // 1. Test parsing des options pipe-séparées
  const pipeOpts = 'startingat=301|max_round=20|double_in=False|split_bull=True|';
  const parsed = parseGameOptions(pipeOpts);
  assert.equal(parsed.startingat, '301');
  const variant = getGameVariantId('Ho_One', pipeOpts);
  assert.equal(variant, '301');

  // 2. Insérer volontairement un record corrompu simulant l'ancien bug
  const db = scores.getDb();
  try {
    const p = db.prepare('SELECT id FROM players LIMIT 1').get();
    const pid = p ? p.id : 1;

    // Simulation d'un Chimay qui avait été étiqueté à tort en ho_one_501_least_darts avec 1 fléchette T19
    db.prepare(`
      INSERT INTO records (game_name, game_variant, record_type, player_id, game_id, value, details)
      VALUES ('Ho_One', '501', 'ho_one_501_least_darts', ?, NULL, 1, 'T19')
    `).run(pid);
  } finally {
    db.close();
  }

  // Réinitialiser la DB via scores.initDB() pour vérifier le nettoyage
  scores.initDB();

  const dbAfter = scores.getDb();
  try {
    // Vérifier qu'aucun record 501 least_darts avec value = 1 ou details = T19 ne subsiste
    const corruptRec = dbAfter.prepare("SELECT * FROM records WHERE record_type = 'ho_one_501_least_darts' AND details = 'T19'").get();
    assert.equal(corruptRec, undefined, 'Corrupted 501 least darts record must be cleaned up');

    // Vérifier que le Chimay Bleu a bien été restauré
    const restoredChimay = dbAfter.prepare("SELECT * FROM records WHERE record_type = 'chimay_bleu' AND details = 'T19'").get();
    assert.ok(restoredChimay, 'Chimay Bleu must be restored');
    assert.equal(restoredChimay.value, 1);
  } finally {
    dbAfter.close();
  }
});

test('Mobile companion: QR code generation in SVG and bootstrap endpoint integration', async () => {
  const qrSvg = generateQRCodeSVG('http://192.168.1.42:3000/companion', {
    color: '#00ff87',
    background: '#060a12'
  });
  assert.ok(qrSvg.startsWith('<svg'), 'QR Code must produce valid SVG output');
  assert.ok(qrSvg.includes('fill="#00ff87"'), 'QR Code must use customized neon fill');
  assert.ok(qrSvg.includes('fill="#060a12"'), 'QR Code must use background fill');
  assert.ok(qrSvg.includes('viewBox="0 0'), 'QR Code must have viewBox attribute');

  // Verify server integration
  const config = new CConfig();
  config.SetValue('SectionAdvanced', 'noserial', true);
  const app = createDartOTronServer({ config, isDev: false });
  await app.start(0, '127.0.0.1');
  const baseUrl = `http://127.0.0.1:${app.server.address().port}`;

  try {
    const res = await fetch(`${baseUrl}/api/bootstrap`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.companionUrl, 'bootstrap must provide companionUrl');
    assert.ok(data.companionUrl.endsWith('/companion'), 'companionUrl must point to /companion');
    assert.ok(data.localIp, 'bootstrap must provide localIp');

    const companionRes = await fetch(`${baseUrl}/companion`);
    assert.equal(companionRes.status, 200);
    const compHtml = await companionRes.text();
    assert.ok(compHtml.includes('DartOTron Compagnon'), 'companion HTML title must be rendered');
    assert.ok(compHtml.includes('companion-view-lobby'), 'companion lobby view must be present');
    assert.ok(compHtml.includes('scoreboard-mirror-wrapper'), 'scoreboard wrapper must be present');
    assert.ok(compHtml.includes('companion-btn-next-player'), 'companion next player button must be present');
    assert.ok(compHtml.includes('companion-footer'), 'companion footer must be present');

    // Verify Wi-Fi / non-localhost request to / redirects to /companion (302)
    const remoteRes = await fetch(`${baseUrl}/`, {
      headers: { 'X-Forwarded-For': '192.168.1.42' },
      redirect: 'manual'
    });
    assert.equal(remoteRes.status, 302, 'Non-localhost request to / must redirect (302)');
    assert.equal(remoteRes.headers.get('location'), '/companion', 'Redirect location must be /companion');

    // Verify localhost request to / returns 200
    const localRes = await fetch(`${baseUrl}/`, { redirect: 'manual' });
    assert.equal(localRes.status, 200, 'Localhost request to / must return 200');
  } finally {
    await app.stop();
  }
});

test('MatchEngine: deduplicates double waiting_player advance and prevents skipping next player turn', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  engine.startMatch({
    gameId: 'Ho_One',
    players: ['P1', 'P2', 'P3'],
    options: { startingat: 301, double_out: false }
  });

  // P1 throws 3 darts -> enters waiting_player
  engine.handleInput('S20');
  engine.handleInput('S20');
  let st = engine.handleInput('S20');
  assert.equal(st.status, 'waiting_player');
  assert.equal(st.actualplayer, 0);

  // First advance signal (from timer or companion) transitions to P2
  st = engine.handleInput('WAITING_PLAYER_ADVANCE');
  assert.equal(st.status, 'playing');
  assert.equal(st.actualplayer, 1);

  // Second duplicate WAITING_PLAYER_ADVANCE or immediate PLAYERBUTTON must NOT skip P2!
  st = engine.handleInput('WAITING_PLAYER_ADVANCE');
  assert.equal(st.status, 'playing');
  assert.equal(st.actualplayer, 1, 'Duplicate WAITING_PLAYER_ADVANCE must not advance to P3');

  st = engine.handleInput('PLAYERBUTTON');
  assert.equal(st.status, 'playing');
  assert.equal(st.actualplayer, 1, 'Immediate duplicate PLAYERBUTTON after waiting_player must not skip P2');
});

test('MatchEngine: evaluates lastHit status (scored / penalty / neutral) across Ho_One, Cricket, and By_Fives', () => {
  const config = new CConfig();
  const scores = new CScores(config);
  const engine = new MatchEngine(config, scores);

  // 1. Ho_One with Double-In: Single before opening -> neutral; Double opens -> scored; Bust -> penalty
  engine.startMatch({
    gameId: 'Ho_One',
    players: ['P1'],
    options: { startingat: 50, double_in: 'True', double_out: 'True' }
  });

  let st = engine.handleInput('S20');
  assert.equal(st.lastHit.status, 'neutral', 'Single before Double-In should be neutral');
  assert.equal(st.lastHit.reason, 'double_in');

  st = engine.handleInput('D20');
  assert.equal(st.lastHit.status, 'scored', 'Double-In opening should be scored');

  // Score is now 10; throwing T20 busts!
  st = engine.handleInput('T20');
  assert.equal(st.lastHit.status, 'penalty', 'Bust in Ho_One should be penalty');
  assert.equal(st.lastHit.reason, 'bust');

  // 2. Cricket: Standard vs Crazy Cutthroat Master
  engine.startMatch({
    gameId: 'Cricket',
    players: ['P1', 'P2'],
    options: { optioncutthroat: 'False', optioncrazy: 'False', optioncrazycutthroatmaster: 'False' }
  });
  st = engine.handleInput('T20');
  assert.equal(st.lastHit.status, 'scored', 'T20 in standard Cricket should be scored');

  st = engine.handleInput('S5');
  assert.equal(st.lastHit.status, 'neutral', 'Non-contract S5 in standard Cricket should be neutral');
  assert.equal(st.lastHit.reason, 'ignored');

  // Cricket with Crazy Cutthroat Master: hitting outside contract adds penalty points -> penalty
  st = engine.startMatch({
    gameId: 'Cricket',
    players: ['P1', 'P2'],
    options: { optioncutthroat: 'True', optioncrazy: 'False', optioncrazycutthroatmaster: 'True' }
  });
  const headerNums = new Set((st.headers || []).map(h => String(h)));
  let nonContractNum = 1;
  while (headerNums.has(String(nonContractNum)) && nonContractNum <= 20) {
    nonContractNum++;
  }
  st = engine.handleInput(`T${nonContractNum}`);
  assert.equal(st.lastHit.status, 'penalty', `T${nonContractNum} outside contract in Crazy Cutthroat Master should be penalty`);
  assert.equal(st.lastHit.reason, 'penalty');
  assert.equal(st.lastHit.penalty, nonContractNum * 3);

  // 3. By_Fives: 3rd dart not multiple of 5 -> penalty; multiple of 5 -> scored
  engine.startMatch({
    gameId: 'By_Fives',
    players: ['P1'],
    options: {}
  });
  st = engine.handleInput('S5');
  assert.equal(st.lastHit.status, 'scored', '1st dart in By_Fives is scored');
  st = engine.handleInput('S5');
  assert.equal(st.lastHit.status, 'scored', '2nd dart in By_Fives is scored');
  st = engine.handleInput('S1');
  assert.equal(st.lastHit.status, 'penalty', '3rd dart in By_Fives when sum (11) is not multiple of 5 should be penalty');
  assert.equal(st.lastHit.reason, 'not_multiple_5');
});

test('Companion Dartboard Matrix: target dimming, contiguous outline slices, and hit coordinates generation', async () => {
  // Mock minimal HTMLElement and customElements for Node environment
  global.HTMLElement = class MockHTMLElement {
    constructor() { this.attributes = {}; }
    getAttribute(name) { return this.attributes[name] || null; }
    setAttribute(name, val) { this.attributes[name] = String(val); }
    hasAttribute(name) { return name in this.attributes; }
    removeAttribute(name) { delete this.attributes[name]; }
  };
  global.customElements = {
    get: () => false,
    define: () => {}
  };

  const { Dartboard } = await import('../public/components/Dartboard.js');
  const board = new Dartboard();

  // Test Cricket targets
  board.targets = ['20', '19', '18', '17', '16', '15', 'B'];
  assert.equal(board.targets.length, 7);

  // Test contiguous group merging (e.g. 20, 1, 18, 4)
  board.targets = ['20', '1', '18', '4'];
  const slices = board.getMergedContiguousTargetSlices();
  assert.ok(slices.length >= 1, 'Should find contiguous slice');
  assert.equal(slices[0].count, 4, 'Should merge 4 consecutive numbers into 1 contour');

  // Test hit coordinates generation across segments
  const ptT20 = board.getHitDotCoords('T20', []);
  const distT20 = Math.hypot(ptT20.x - 400, ptT20.y - 400);
  assert.ok(distT20 >= 140 && distT20 <= 165, `T20 distance from center (${distT20}) must be within triple ring (144-162)`);
  assert.ok(ptT20.y < 400, 'T20 must be in the upper half of the board (y < 400)');

  const ptDB = board.getHitDotCoords('DB', []);
  const distDB = Math.hypot(ptDB.x - 400, ptDB.y - 400);
  assert.ok(distDB <= 13, `DB distance (${distDB}) must be within double bull radius`);

  const ptSB = board.getHitDotCoords('SB', []);
  const distSB = Math.hypot(ptSB.x - 400, ptSB.y - 400);
  assert.ok(distSB >= 13 && distSB <= 28, `SB distance (${distSB}) must be within outer bull radius`);

  // Test render output includes dimming and explicit hit coordinates
  board.hits = ['T20', 'DB'];
  board.render();
  assert.ok(board.innerHTML.includes('is-dimmed'), 'Dartboard should dim inactive segments when targets are set');
  assert.ok(board.innerHTML.includes('target-merged-contour'), 'Dartboard should render merged contour');
  assert.ok(board.innerHTML.includes('hit-dot-group'), 'Dartboard should render hit dot groups');
  assert.doesNotMatch(board.innerHTML, /cx="0(\.0+)?"\s+cy="0(\.0+)?"/, 'Hit dot coordinates must not be 0,0');
});

test('Companion Dartboard: Cricket target numbers closed by all players become inactive', async () => {
  function calculateCompanionTargets(state) {
    const isCricket = String(state.gameId || '').toLowerCase().includes('cricket');
    if (isCricket) {
      const headers = state.headers || [];
      const players = state.players || [];
      return headers
        .map(h => String(h || '').trim())
        .filter((h, colIdx) => {
          if (!h || h === '-' || h === 'RND' || h === 'PPR' || h === 'PPD') return false;
          const isClosedByAll = players.length > 0 && players.every(pl => Number(pl.columns?.[colIdx]?.value || 0) >= 3);
          return !isClosedByAll;
        });
    }
    return [];
  }

  const cricketState = {
    gameId: 'Cricket',
    headers: ['20', '19', '18', '17', '16', '15', 'B'],
    players: [
      {
        ident: 0,
        PlayerName: 'Joueur 1',
        columns: [
          { value: 3 }, // 20 closed
          { value: 3 }, // 19 closed
          { value: 1 }, // 18 open (1 hit)
          { value: 0 },
          { value: 0 },
          { value: 0 },
          { value: 3 }  // Bull closed
        ]
      },
      {
        ident: 1,
        PlayerName: 'Joueur 2',
        columns: [
          { value: 3 }, // 20 closed by both! -> dead
          { value: 2 }, // 19 closed by P1 only -> active
          { value: 0 }, // 18 open -> active
          { value: 0 },
          { value: 0 },
          { value: 0 },
          { value: 3 }  // Bull closed by both! -> dead
        ]
      }
    ]
  };

  const activeTargets = calculateCompanionTargets(cricketState);
  assert.ok(!activeTargets.includes('20'), 'Target 20 must be excluded when closed by all players');
  assert.ok(!activeTargets.includes('B'), 'Target Bull must be excluded when closed by all players');
  assert.ok(activeTargets.includes('19'), 'Target 19 must remain active when closed by only one player');
  assert.ok(activeTargets.includes('18'), 'Target 18 must remain active when not closed by all');
  assert.deepEqual(activeTargets, ['19', '18', '17', '16', '15']);
});

test('Client i18n: validates dictionaries integrity, key symmetry & I18nEngine behavior', async () => {
  const ROOT_DIR = path.resolve(import.meta.dirname, '..');
  const frPath = path.join(ROOT_DIR, 'public', 'i18n', 'fr.json');
  const enPath = path.join(ROOT_DIR, 'public', 'i18n', 'en.json');
  const nlPath = path.join(ROOT_DIR, 'public', 'i18n', 'nl.json');
  const dePath = path.join(ROOT_DIR, 'public', 'i18n', 'de.json');

  assert.ok(fs.existsSync(frPath), 'fr.json exists');
  assert.ok(fs.existsSync(enPath), 'en.json exists');
  assert.ok(fs.existsSync(nlPath), 'nl.json exists');
  assert.ok(fs.existsSync(dePath), 'de.json exists');

  const frDict = JSON.parse(fs.readFileSync(frPath, 'utf-8'));
  const enDict = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  const nlDict = JSON.parse(fs.readFileSync(nlPath, 'utf-8'));
  const deDict = JSON.parse(fs.readFileSync(dePath, 'utf-8'));

  // Collecte récursive des clés
  function collectKeys(obj, prefix = '') {
    let keys = [];
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        keys = keys.concat(collectKeys(v, full));
      } else {
        keys.push(full);
      }
    }
    return keys;
  }

  const frKeys = collectKeys(frDict);
  const enKeys = collectKeys(enDict);
  const nlKeys = collectKeys(nlDict);
  const deKeys = collectKeys(deDict);

  // Vérifier la symétrie des clés
  const missingInEn = frKeys.filter(k => !enKeys.includes(k));
  const missingInFr = enKeys.filter(k => !frKeys.includes(k));
  const missingInNl = frKeys.filter(k => !nlKeys.includes(k));
  const extraInNl = nlKeys.filter(k => !frKeys.includes(k));
  const missingInDe = frKeys.filter(k => !deKeys.includes(k));
  const extraInDe = deKeys.filter(k => !frKeys.includes(k));

  assert.deepEqual(missingInEn, [], `Clés présentes dans fr.json mais absentes de en.json: ${missingInEn.join(', ')}`);
  assert.deepEqual(missingInFr, [], `Clés présentes dans en.json mais absentes de fr.json: ${missingInFr.join(', ')}`);
  assert.deepEqual(missingInNl, [], `Clés présentes dans fr.json mais absentes de nl.json: ${missingInNl.join(', ')}`);
  assert.deepEqual(extraInNl, [], `Clés présentes dans nl.json mais absentes de fr.json: ${extraInNl.join(', ')}`);
  assert.deepEqual(missingInDe, [], `Clés présentes dans fr.json mais absentes de de.json: ${missingInDe.join(', ')}`);
  assert.deepEqual(extraInDe, [], `Clés présentes dans de.json mais absentes de fr.json: ${extraInDe.join(', ')}`);

  // Importer dynamiquement I18nEngine
  const { I18nEngine } = await import('../public/js/lib/i18n.js');
  const engine = new I18nEngine();

  // Test de normalisation de langue
  assert.equal(engine.normalizeLang('fr_FR'), 'fr');
  assert.equal(engine.normalizeLang('FR'), 'fr');
  assert.equal(engine.normalizeLang('en-US'), 'en');
  assert.equal(engine.normalizeLang('EN_GB'), 'en');
  assert.equal(engine.normalizeLang('nl-NL'), 'nl');
  assert.equal(engine.normalizeLang('NL_BE'), 'nl');
  assert.equal(engine.normalizeLang('de-DE'), 'de');
  assert.equal(engine.normalizeLang('DE_AT'), 'de');
  assert.equal(engine.normalizeLang(null), 'fr');
  assert.equal(engine.normalizeLang('es-ES'), 'fr');

  // Injecter directement les dictionnaires pour test unitaire synchrone
  engine.dictionaries.set('fr', frDict);
  engine.dictionaries.set('en', enDict);
  engine.dictionaries.set('nl', nlDict);
  engine.dictionaries.set('de', deDict);
  engine.currentLang = 'fr';

  // Test traduction directe
  assert.equal(engine.t('common.ok'), 'OK');
  assert.equal(engine.t('match.next_player'), 'JOUEUR SUIVANT');
  assert.equal(engine.t('match.th_player'), 'JOUEUR');
  assert.equal(engine.t('records.new_record'), 'NOUVEAU RECORD');
  assert.equal(engine.t('vk.clear'), 'VIDER');
  assert.equal(engine.t('vk.cancel'), 'ANNULER');
  assert.equal(engine.t('vk.validate'), 'VALIDER');
  assert.equal(engine.t('vk.shift'), 'MAJ');
  assert.equal(engine.t('vk.space'), 'ESPACE');
  assert.equal(engine.t('vk.backspace'), 'EFFACER');
  assert.equal(engine.t('game_options.meta.max_round.desc'), 'Nombre maximum de volées autorisées');
  assert.equal(engine.t('game_options.meta.equal.desc'), 'Même nombre de fléchettes pour tous les joueurs (rattrapage & match nul)');
  assert.equal(engine.t('match.winner_announcement', { name: 'Alice' }), 'Victoire : Alice !');

  // Test bascule en anglais
  engine.currentLang = 'en';
  assert.equal(engine.t('common.ok'), 'OK');
  assert.equal(engine.t('common.yes'), 'YES');
  assert.equal(engine.t('common.no'), 'NO');
  assert.equal(engine.t('match.next_player'), 'NEXT PLAYER');
  assert.equal(engine.t('match.next_turn'), 'NEXT ROUND');
  assert.equal(engine.t('match.th_player'), 'PLAYER');
  assert.equal(engine.t('records.new_record'), 'NEW RECORD');
  assert.equal(engine.t('vk.clear'), 'CLEAR');
  assert.equal(engine.t('vk.cancel'), 'CANCEL');
  assert.equal(engine.t('vk.validate'), 'CONFIRM');
  assert.equal(engine.t('vk.shift'), 'SHIFT');
  assert.equal(engine.t('vk.space'), 'SPACE');
  assert.equal(engine.t('vk.backspace'), 'DELETE');
  assert.equal(engine.t('game_options.meta.max_round.desc'), 'Maximum number of rounds allowed');
  assert.equal(engine.t('game_options.meta.equal.desc'), 'Same number of darts for all players (draw & catch-up)');
  assert.equal(engine.t('match.miss_sub'), 'OFF TARGET (0 PT)');
  assert.equal(engine.t('match.miss_penalty', { penalty: 25 }), 'PENALTY (+25 PTS)');
  assert.equal(engine.t('hits.simple'), 'SINGLE HIT');
  assert.equal(engine.t('hits.triple'), 'TRIPLE HIT');
  assert.equal(engine.t('hits.miss'), 'OFF TARGET');
  assert.equal(engine.t('match.interrupted_title'), 'MATCH INTERRUPTED');
  assert.equal(engine.t('match.interrupted_subtitle'), 'Returning to main menu');
  assert.equal(engine.t('settings.calib.press_target'), 'Press target segment:');
  assert.equal(engine.t('settings.calib.btn_player'), 'NEXT PLAYER BUTTON');
  assert.equal(engine.t('settings.serial.connected'), 'Connected');
  assert.equal(engine.t('settings.serial.disconnected'), 'Disconnected');
  assert.equal(engine.t('players.active_badge', { count: 3 }), '3 ACTIVE');
  assert.equal(engine.t('players.active_badge_singular'), '1 ACTIVE');
  assert.equal(engine.t('match.winner_announcement', { name: 'Alice' }), 'Winner: Alice!');

  // Test bascule en néerlandais (nl)
  engine.currentLang = 'nl';
  assert.equal(engine.t('common.ok'), 'OK');
  assert.equal(engine.t('common.yes'), 'JA');
  assert.equal(engine.t('common.no'), 'NEE');
  assert.equal(engine.t('match.next_player'), 'VOLGENDE SPELER');
  assert.equal(engine.t('records.new_record'), 'NIEUW RECORD');
  assert.equal(engine.t('vk.clear'), 'WISSEN');
  assert.equal(engine.t('vk.cancel'), 'ANNULEREN');
  assert.equal(engine.t('vk.validate'), 'BEVESTIGEN');
  assert.equal(engine.t('vk.shift'), 'SHIFT');
  assert.equal(engine.t('players.active_badge', { count: 3 }), '3 ACTIEF');
  assert.equal(engine.t('match.winner_announcement', { name: 'Alice' }), 'Winnaar: Alice!');

  // Test bascule en allemand (de)
  engine.currentLang = 'de';
  assert.equal(engine.t('common.ok'), 'OK');
  assert.equal(engine.t('common.yes'), 'JA');
  assert.equal(engine.t('common.no'), 'NEIN');
  assert.equal(engine.t('match.next_player'), 'NÄCHSTER SPIELER');
  assert.equal(engine.t('records.new_record'), 'NEUER REKORD');
  assert.equal(engine.t('vk.clear'), 'LEEREN');
  assert.equal(engine.t('vk.cancel'), 'ABBRECHEN');
  assert.equal(engine.t('vk.validate'), 'BESTÄTIGEN');
  assert.equal(engine.t('vk.shift'), 'SHIFT');
  assert.equal(engine.t('players.active_badge', { count: 3 }), '3 AKTIV');
  assert.equal(engine.t('match.winner_announcement', { name: 'Alice' }), 'Sieger: Alice!');

  // Test fallback si clé inconnue
  assert.equal(engine.t('unknown.key', {}, 'Défaut'), 'Défaut');

  // Test has()
  assert.ok(engine.has('common.save'));
  assert.ok(!engine.has('common.nonexistent'));
});













