/**
 * Module Match Persistence & Stats DartOTron (server/db/matches.js)
 * Gère l'enregistrement atomique des parties terminées, des participants et des impacts.
 */

import { calculateHitScore, getGameVariantId } from './records.js';

export class MatchesRepository {
  constructor(getDb, formatOptions) {
    this.getDb = getDb;
    this.formatOptions = formatOptions || ((opts) => {
      if (typeof opts === 'string') return opts;
      let str = '';
      for (const [k, v] of Object.entries(opts || {})) {
        str += `${k}=${v}|`;
      }
      return str;
    });
  }

  RecordCompletedMatch({
    gameName,
    gameOptions = {},
    nbPlayers = 1,
    winnerName = null,
    winnerId = null,
    startedAt = null,
    endedAt = null,
    durationSeconds = 0,
    participants = [],
    hits = [],
    records = []
  }) {
    const db = this.getDb();
    try {
      db.exec('BEGIN TRANSACTION;');

      const formattedOpts = this.formatOptions(gameOptions);
      const gamename = String(gameName || '');
      const nbplayers = Number(nbPlayers) || 1;

      // 1. Résolution de l'ID du vainqueur
      let finalWinnerId = winnerId;
      if (!finalWinnerId && winnerName) {
        const winPlayer = db.prepare('SELECT id FROM players WHERE LOWER(name) = LOWER(?)').get(String(winnerName).trim());
        if (winPlayer) finalWinnerId = winPlayer.id;
      }

      // 2. Création de la partie dans la table 'games'
      const matchDate = startedAt || endedAt || new Date().toISOString();
      const insertGameStmt = db.prepare(`
        INSERT INTO games (date, gamename, gameoptions, nbplayers, winner_id, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const gameRes = insertGameStmt.run(
        matchDate,
        gamename,
        formattedOpts,
        nbplayers,
        finalWinnerId || null,
        durationSeconds || null
      );
      const gameId = Number(gameRes.lastInsertRowid);

      // Cache pour résolution rapide des ID joueurs
      const playerIdCache = new Map();
      const getPlayerId = (nameOrId) => {
        if (!nameOrId && nameOrId !== 0) return null;
        if (typeof nameOrId === 'number' && Number.isFinite(nameOrId)) return nameOrId;
        const s = String(nameOrId).trim();
        if (/^\d+$/.test(s)) return parseInt(s, 10);
        const low = s.toLowerCase();
        if (playerIdCache.has(low)) return playerIdCache.get(low);

        let row = db.prepare('SELECT id FROM players WHERE LOWER(name) = ?').get(low);
        if (!row) {
          const ins = db.prepare('INSERT INTO players (name) VALUES (?)').run(s);
          const newId = Number(ins.lastInsertRowid);
          playerIdCache.set(low, newId);
          return newId;
        }
        playerIdCache.set(low, row.id);
        return row.id;
      };

      // 3. Enregistrement des participants et mise à jour des statistiques
      const insertParticipant = db.prepare(`
        INSERT OR REPLACE INTO game_participants (game_id, player_id, rank, total_points, darts_thrown, stats)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const updatePlayerStats = db.prepare(`
        UPDATE players
        SET games_played = games_played + 1,
            wins = wins + ?,
            last_played = ?
        WHERE id = ?
      `);

      for (const part of participants) {
        const pid = getPlayerId(part.id || part.playerId || part.name || part.playerName);
        if (!pid) continue;
        const pRow = db.prepare('SELECT name FROM players WHERE id = ?').get(pid);
        const pName = pRow ? pRow.name : (part.name || part.playerName || `Joueur ${pid}`);

        const isWin = finalWinnerId === pid || (winnerName && pName.toLowerCase() === winnerName.toLowerCase()) ? 1 : 0;
        const rank = part.rank || (isWin ? 1 : 2);
        const totalPts = Number(part.totalPoints ?? part.score ?? 0);
        const darts = Number(part.dartsThrown ?? 0);
        const statsJson = typeof part.stats === 'object' ? JSON.stringify(part.stats) : String(part.stats || '{}');

        insertParticipant.run(gameId, pid, rank, totalPts, darts, statsJson);
        updatePlayerStats.run(isWin, endedAt || matchDate, pid);
      }

      // 4. Versement des impacts de fléchettes dans 'dart_hits'
      const insertHit = db.prepare(`
        INSERT INTO dart_hits (game_id, player_id, round_number, dart_number, hit, score_value, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const h of hits) {
        const pid = getPlayerId(h.playerId || h.player_id || (h.playerIndex !== undefined ? (participants[h.playerIndex]?.name || h.playerName || h.playerId) : (h.playerName || h.player)));
        if (!pid) continue;
        const hitKey = String(h.hit || h.key || '').toUpperCase().trim();
        const scoreVal = Number.isFinite(h.scoreValue) ? h.scoreValue : calculateHitScore(hitKey);
        const roundNum = Number(h.roundNumber || h.round || 1);
        const dartNum = Number(h.dartNumber || h.dart || 1);
        const hitTime = h.createdAt || matchDate;

        insertHit.run(gameId, pid, roundNum, dartNum, hitKey, scoreVal, hitTime);
      }

      // 5. Enregistrement des records dans 'records'
      const variant = getGameVariantId(gamename, gameOptions);
      const insertRec = db.prepare(`
        INSERT INTO records (game_name, game_variant, record_type, player_id, game_id, value, details, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const rec of records) {
        const pid = getPlayerId(rec.playerId || rec.player_id || (rec.playerIndex !== undefined ? (participants[rec.playerIndex]?.name || rec.playerName) : (rec.playerName || rec.player)));
        if (!pid) continue;
        const recType = String(rec.recordType || rec.record_type || rec.scorename || 'record');
        const recGame = String(rec.gameName || rec.game_name || gamename || '*');
        const recVariant = rec.gameVariant || rec.game_variant || (recGame === gamename ? variant : null);
        const recVal = Number(rec.value ?? rec.score ?? 1);
        const recDetails = String(rec.details || rec.triple || '');
        const recDate = rec.date || matchDate;

        // Assurer que la définition existe
        db.prepare(`
          INSERT OR IGNORE INTO record_definitions (id, game_name, game_variant, record_type, name, unit)
          VALUES (?, ?, ?, ?, ?, '')
        `).run(recType, recGame, recVariant, recType, recType);

        insertRec.run(recGame, recVariant, recType, pid, gameId, recVal, recDetails, recDate);
      }

      // 5b. Évaluation automatique des records 'match_result' personnalisés configurés pour ce jeu
      const matchDefs = db.prepare(`
        SELECT * FROM record_definitions
        WHERE is_system = 0 AND calc_type = 'match_result' AND (game_name = '*' OR game_name = ?)
      `).all(gamename || '*');

      for (const def of matchDefs) {
        for (const part of participants) {
          const pid = getPlayerId(part.id || part.playerId || part.name || part.playerName);
          if (!pid) continue;
          const pRow = db.prepare('SELECT name FROM players WHERE id = ?').get(pid);
          const pName = pRow ? pRow.name : (part.name || part.playerName || `Joueur ${pid}`);
          const isWin = finalWinnerId === pid || (winnerName && pName.toLowerCase() === winnerName.toLowerCase()) ? 1 : 0;
          const rank = part.rank || (isWin ? 1 : 2);

          let passCondition = false;
          if (def.match_condition === 'win' && rank === 1) passCondition = true;
          else if (def.match_condition === 'loss' && rank > 1) passCondition = true;
          else if (def.match_condition === 'any') passCondition = true;

          if (passCondition) {
            let val = 0;
            if (def.match_metric === 'total_points') {
              val = Number(part.totalPoints ?? part.score ?? 0);
            } else if (def.match_metric === 'darts_thrown') {
              val = Number(part.dartsThrown ?? 0);
            } else {
              val = Number(part.totalPoints ?? part.score ?? 0);
            }
            const det = rank === 1 ? 'Victoire' : `Défaite (#${rank})`;
            insertRec.run(def.game_name, def.game_variant || variant, def.id, pid, gameId, val, det, endedAt || matchDate);
          }
        }
      }

      db.exec('COMMIT;');
      return gameId;
    } catch (err) {
      try { db.exec('ROLLBACK;'); } catch (_) {}
      throw err;
    } finally {
      db.close();
    }
  }

  RecordMatchParticipation(playerNames = [], winnerName = null) {
    if (!Array.isArray(playerNames) || playerNames.length === 0) return;
    const db = this.getDb();
    try {
      db.exec('BEGIN TRANSACTION;');
      const now = new Date().toISOString();
      const insertOrUpdatePlayer = db.prepare(`
        INSERT INTO players (name, games_played, wins, last_played)
        VALUES (?, 1, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
          games_played = players.games_played + 1,
          wins = players.wins + excluded.wins,
          last_played = excluded.last_played
      `);

      for (const name of playerNames) {
        const clean = String(name || '').trim();
        if (!clean) continue;
        const isWin = (winnerName && clean.toLowerCase() === String(winnerName).toLowerCase()) ? 1 : 0;
        insertOrUpdatePlayer.run(clean, isWin, now);
      }
      db.exec('COMMIT;');
    } catch (err) {
      try { db.exec('ROLLBACK;'); } catch (_) {}
      throw err;
    } finally {
      db.close();
    }
  }

  AddGame({ gamename, gameoptions, nbplayers }) {
    const db = this.getDb();
    try {
      const formattedOpts = this.formatOptions(gameOptions);
      const res = db.prepare(`
        INSERT INTO games (date, gamename, gameoptions, nbplayers)
        VALUES (datetime('now', 'localtime'), ?, ?, ?)
      `).run(String(gamename || ''), formattedOpts, Number(nbplayers) || 1);
      return Number(res.lastInsertRowid);
    } finally {
      db.close();
    }
  }

  AddScore({ game_id, scorename, score, playername, gamename = null, gameoptions = null }) {
    const numericScore = parseFloat(score);
    const val = Number.isFinite(numericScore) ? numericScore : 0;
    const cleanPlayer = String(playername || '').trim();
    if (!cleanPlayer) return;

    const db = this.getDb();
    try {
      let p = db.prepare('SELECT id FROM players WHERE LOWER(name) = LOWER(?)').get(cleanPlayer);
      if (!p) {
        const ins = db.prepare('INSERT INTO players (name) VALUES (?)').run(cleanPlayer);
        p = { id: Number(ins.lastInsertRowid) };
      }
      const sName = String(scorename || 'score');
      const gName = gamename || '*';
      const variant = getGameVariantId(gName, gameoptions);

      let recDef = null;
      if (variant) {
        recDef = db.prepare(`
          SELECT id, game_name, game_variant FROM record_definitions
          WHERE (id = ? OR record_type = ?) AND game_name = ? AND game_variant = ?
          LIMIT 1
        `).get(sName, sName, gName, variant);
      }
      if (!recDef) {
        recDef = db.prepare(`
          SELECT id, game_name, game_variant FROM record_definitions
          WHERE (id = ? OR record_type = ?) AND (game_name = ? OR game_name = '*')
          LIMIT 1
        `).get(sName, sName, gName);
      }
      const resolvedType = recDef ? recDef.id : sName;
      const resolvedGame = recDef ? recDef.game_name : gName;
      const resolvedVariant = recDef ? (recDef.game_variant || variant) : variant;

      db.prepare(`
        INSERT OR IGNORE INTO record_definitions (id, game_name, game_variant, record_type, name, unit)
        VALUES (?, ?, ?, ?, ?, '')
      `).run(resolvedType, resolvedGame, resolvedVariant, sName, sName);

      db.prepare(`
        INSERT INTO records (game_name, game_variant, record_type, player_id, game_id, value, date)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(resolvedGame, resolvedVariant, resolvedType, p.id, game_id || null, val);
    } finally {
      db.close();
    }
  }

  RecordDartHit({ game_id = null, gamename = '', playername, hit }) {
    const cleanPlayer = String(playername || '').trim();
    const cleanHit = String(hit || '').toUpperCase().trim();
    if (!cleanPlayer || !cleanHit) return;

    const db = this.getDb();
    try {
      let p = db.prepare('SELECT id FROM players WHERE LOWER(name) = LOWER(?)').get(cleanPlayer);
      if (!p) {
        const ins = db.prepare('INSERT INTO players (name) VALUES (?)').run(cleanPlayer);
        p = { id: Number(ins.lastInsertRowid) };
      }
      const scoreVal = calculateHitScore(cleanHit);
      db.prepare(`
        INSERT INTO dart_hits (game_id, player_id, round_number, dart_number, hit, score_value, created_at)
        VALUES (?, ?, 1, 1, ?, ?, datetime('now', 'localtime'))
      `).run(game_id || null, p.id, cleanHit, scoreVal);
    } finally {
      db.close();
    }
  }

  GetGameHits(gameId) {
    const db = this.getDb();
    try {
      return db.prepare(`
        SELECT dh.id, dh.round_number, dh.dart_number, dh.hit, dh.score_value, p.name AS player_name
        FROM dart_hits dh
        JOIN players p ON dh.player_id = p.id
        WHERE dh.game_id = ?
        ORDER BY dh.round_number ASC, dh.dart_number ASC
      `).all(Number(gameId));
    } finally {
      db.close();
    }
  }
}

