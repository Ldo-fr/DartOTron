/**
 * Module Gestion des Joueurs & Lobby DartOTron (server/db/players.js)
 * Gère les profils joueurs, l'état persistant du lobby et les statistiques individuelles.
 */

export class PlayersRepository {
  constructor(getDb) {
    this.getDb = getDb;
  }

  GetPlayers() {
    const db = this.getDb();
    try {
      return db.prepare(`
        SELECT id, name, games_played, wins, created_at, last_played
        FROM players
        ORDER BY name COLLATE NOCASE ASC
      `).all();
    } finally {
      db.close();
    }
  }

  GetPlayer(idOrName) {
    const db = this.getDb();
    try {
      if (typeof idOrName === 'number' || /^\d+$/.test(String(idOrName))) {
        return db.prepare('SELECT id, name, games_played, wins, created_at, last_played FROM players WHERE id = ?').get(Number(idOrName));
      }
      return db.prepare('SELECT id, name, games_played, wins, created_at, last_played FROM players WHERE LOWER(name) = LOWER(?)').get(String(idOrName).trim());
    } finally {
      db.close();
    }
  }

  AddPlayer(name) {
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      throw new Error('Le nom du joueur ne peut pas être vide');
    }
    const db = this.getDb();
    try {
      const existing = db.prepare('SELECT id, name FROM players WHERE LOWER(name) = LOWER(?)').get(cleanName);
      if (existing) {
        return existing;
      }
      const res = db.prepare('INSERT INTO players (name) VALUES (?)').run(cleanName);
      return {
        id: Number(res.lastInsertRowid),
        name: cleanName,
        games_played: 0,
        wins: 0,
        created_at: new Date().toISOString(),
        last_played: null
      };
    } finally {
      db.close();
    }
  }

  RenamePlayer(idOrName, newName) {
    const cleanNew = String(newName || '').trim();
    if (!cleanNew) {
      throw new Error('Le nouveau nom ne peut pas être vide');
    }
    const db = this.getDb();
    try {
      const existingNew = db.prepare('SELECT id FROM players WHERE LOWER(name) = LOWER(?)').get(cleanNew);
      const isNum = typeof idOrName === 'number' || /^\d+$/.test(String(idOrName));
      const target = isNum
        ? db.prepare('SELECT id, name FROM players WHERE id = ?').get(Number(idOrName))
        : db.prepare('SELECT id, name FROM players WHERE LOWER(name) = LOWER(?)').get(String(idOrName).trim());

      if (!target) {
        throw new Error('Joueur introuvable');
      }
      if (existingNew && existingNew.id !== target.id) {
        throw new Error('Un joueur porte déjà ce nom');
      }

      db.prepare('UPDATE players SET name = ? WHERE id = ?').run(cleanNew, target.id);
      return { id: target.id, name: cleanNew };
    } finally {
      db.close();
    }
  }

  DeletePlayer(idOrName) {
    const db = this.getDb();
    try {
      const isNum = typeof idOrName === 'number' || /^\d+$/.test(String(idOrName));
      const target = isNum
        ? db.prepare('SELECT id, name FROM players WHERE id = ?').get(Number(idOrName))
        : db.prepare('SELECT id, name FROM players WHERE LOWER(name) = LOWER(?)').get(String(idOrName).trim());

      if (!target) {
        return false;
      }

      db.prepare('DELETE FROM players WHERE id = ?').run(target.id);

      const count = db.prepare('SELECT COUNT(*) as cnt FROM players').get();
      if (!count || count.cnt === 0) {
        const ins = db.prepare("INSERT INTO players (name) VALUES ('Joueur 1')").run();
        const p1Id = Number(ins.lastInsertRowid);
        db.prepare('INSERT OR IGNORE INTO lobby_players (player_id, order_index) VALUES (?, 0)').run(p1Id);
      }
      return true;
    } finally {
      db.close();
    }
  }

  GetLobbyState() {
    const db = this.getDb();
    try {
      const stateRow = db.prepare('SELECT selected_game FROM lobby_state WHERE id = 1').get();
      const selectedGame = stateRow ? stateRow.selected_game : 'Cricket';

      const activePlayers = db.prepare(`
        SELECT p.id, p.name, lp.order_index
        FROM lobby_players lp
        JOIN players p ON lp.player_id = p.id
        ORDER BY lp.order_index ASC
      `).all();

      return {
        selectedGame,
        activePlayers: activePlayers.map(p => p.name),
        activePlayerIds: activePlayers.map(p => p.id),
        activePlayerNames: activePlayers.map(p => p.name),
        players: activePlayers
      };
    } finally {
      db.close();
    }
  }

  SaveLobbyState({ selectedGame, playerIds = [], playerNames = [] }) {
    const db = this.getDb();
    try {
      db.exec('BEGIN TRANSACTION;');

      if (selectedGame) {
        db.prepare(`
          INSERT INTO lobby_state (id, selected_game, updated_at)
          VALUES (1, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            selected_game = excluded.selected_game,
            updated_at = CURRENT_TIMESTAMP
        `).run(String(selectedGame));
      }

      let resolvedIds = [];
      if (Array.isArray(playerIds) && playerIds.length > 0) {
        resolvedIds = playerIds.map(Number).filter(id => Number.isFinite(id));
      } else if (Array.isArray(playerNames) && playerNames.length > 0) {
        for (const name of playerNames) {
          const clean = String(name || '').trim();
          if (!clean) continue;
          let p = db.prepare('SELECT id FROM players WHERE LOWER(name) = LOWER(?)').get(clean);
          if (!p) {
            const ins = db.prepare('INSERT INTO players (name) VALUES (?)').run(clean);
            p = { id: Number(ins.lastInsertRowid) };
          }
          resolvedIds.push(p.id);
        }
      }

      if (resolvedIds.length > 0) {
        db.prepare('DELETE FROM lobby_players').run();
        const insertLobbyPlayer = db.prepare('INSERT INTO lobby_players (player_id, order_index) VALUES (?, ?)');
        resolvedIds.forEach((pId, idx) => {
          insertLobbyPlayer.run(pId, idx);
        });
      }

      db.exec('COMMIT;');
      return this.GetLobbyState();
    } catch (err) {
      try { db.exec('ROLLBACK;'); } catch (_) {}
      throw err;
    } finally {
      db.close();
    }
  }

  getPlayerHandicapStat(playerName, statType = 'PPD') {
    const db = this.getDb();
    try {
      const p = db.prepare('SELECT id FROM players WHERE LOWER(name) = LOWER(?)').get(String(playerName || '').trim());
      if (!p) return 0;

      if (statType === 'MPR') {
        const row = db.prepare(`
          SELECT AVG(value) as avgScore
          FROM records
          WHERE player_id = ? AND (record_type = 'cricket_mpr' OR record_type = 'Marks Per Round' OR record_type = 'mpr')
        `).get(p.id);
        return row?.avgScore ? Math.round(Number(row.avgScore) * 100) / 100 : 0;
      }

      const row = db.prepare(`
        SELECT AVG(value) as avgScore
        FROM records
        WHERE player_id = ? AND (record_type = 'ho_one_ppr' OR record_type = 'Points Per Round' OR record_type = 'ppr')
      `).get(p.id);
      const avgPPR = row?.avgScore ? Number(row.avgScore) : 0;
      return Math.round((avgPPR / 3) * 100) / 100;
    } finally {
      db.close();
    }
  }

  GetPlayersStats(knownNames = []) {
    const db = this.getDb();
    try {
      const allDbPlayers = db.prepare('SELECT id, name, games_played, wins, last_played FROM players').all();
      const playerMap = new Map();

      for (const p of allDbPlayers) {
        playerMap.set(p.name.toLowerCase(), p);
      }
      for (const n of knownNames) {
        const clean = String(n || '').trim();
        if (clean && !playerMap.has(clean.toLowerCase())) {
          playerMap.set(clean.toLowerCase(), { id: null, name: clean, games_played: 0, wins: 0, last_played: null });
        }
      }

      const pprStmt = db.prepare(`
        SELECT AVG(value) AS avgVal
        FROM records
        WHERE player_id = ? AND (
          record_type = 'ho_one_ppr'
          OR record_type LIKE 'ho_one_%_ppr'
          OR record_type = 'Points Per Round'
          OR record_type = 'ppr'
        )
      `);
      const mprStmt = db.prepare(`
        SELECT AVG(value) AS avgVal
        FROM records
        WHERE player_id = ? AND (
          record_type = 'cricket_mpr'
          OR record_type LIKE 'cricket_%_mpr'
          OR record_type = 'Marks Per Round'
          OR record_type = 'mpr'
        )
      `);
      const chimayStmt = db.prepare(`
        SELECT COUNT(*) AS cnt
        FROM records
        WHERE player_id = ? AND record_type = 'chimay_bleu'
      `);
      const dartHitsStmt = db.prepare(`
        SELECT AVG(score_value) * 3.0 AS avg3D
        FROM dart_hits
        WHERE player_id = ?
      `);
      const partStmt = db.prepare(`
        SELECT (SUM(total_points) * 3.0 / SUM(darts_thrown)) AS avg3D
        FROM game_participants
        WHERE player_id = ? AND darts_thrown > 0
      `);

      const results = [];
      for (const p of playerMap.values()) {
        const pid = p.id;
        let avgPPR = pid ? Number(pprStmt.get(pid)?.avgVal || 0) : 0;
        const avgMPR = pid ? Number(mprStmt.get(pid)?.avgVal || 0) : 0;
        const chimayCount = pid ? Number(chimayStmt.get(pid)?.cnt || 0) : 0;

        // Fallbacks pour avg3DAllTime si aucun record PPR explicite n'a été enregistré
        let avg3DAllTime = avgPPR;
        if (avg3DAllTime <= 0 && pid) {
          const hitAvg = Number(dartHitsStmt.get(pid)?.avg3D || 0);
          if (hitAvg > 0) {
            avg3DAllTime = hitAvg;
            avgPPR = hitAvg;
          } else {
            const partAvg = Number(partStmt.get(pid)?.avg3D || 0);
            if (partAvg > 0) {
              avg3DAllTime = partAvg;
              avgPPR = partAvg;
            }
          }
        }
        avg3DAllTime = Math.round(avg3DAllTime * 10) / 10;
        avgPPR = Math.round(avgPPR * 10) / 10;

        results.push({
          id: p.id,
          name: p.name,
          gamesPlayed: Number(p.games_played || 0),
          wins: Number(p.wins || 0),
          chimayCount,
          avgPPR,
          avgMPR: Math.round(avgMPR * 100) / 100,
          avg3DAllTime,
          lastPlayed: p.last_played || null
        });
      }

      return results;
    } finally {
      db.close();
    }
  }

  GetPlayerProfile(playerName) {
    const cleanName = String(playerName || '').trim();
    if (!cleanName) return null;
    const low = cleanName.toLowerCase();

    const db = this.getDb();
    try {
      const p = db.prepare('SELECT id, name, games_played, wins, created_at, last_played FROM players WHERE LOWER(name) = ?').get(low);
      if (!p) return null;

      const pprRow = db.prepare(`
        SELECT AVG(value) AS avgVal FROM records
        WHERE player_id = ? AND (
          record_type = 'ho_one_ppr'
          OR record_type LIKE 'ho_one_%_ppr'
          OR record_type = 'Points Per Round'
          OR record_type = 'ppr'
        )
      `).get(p.id);

      const mprRow = db.prepare(`
        SELECT AVG(value) AS avgVal FROM records
        WHERE player_id = ? AND (
          record_type = 'cricket_mpr'
          OR record_type LIKE 'cricket_%_mpr'
          OR record_type = 'Marks Per Round'
          OR record_type = 'mpr'
        )
      `).get(p.id);

      const bestFinishRow = db.prepare(`
        SELECT MAX(value) AS maxVal FROM records
        WHERE player_id = ? AND (
          record_type = 'ho_one_best_finish'
          OR record_type LIKE 'ho_one_%_best_finish'
          OR record_type = 'Best Finish'
        )
      `).get(p.id);

      const chimayCount = db.prepare(`
        SELECT COUNT(*) AS cnt FROM records
        WHERE player_id = ? AND record_type = 'chimay_bleu'
      `).get(p.id)?.cnt || 0;

      const ton80Count = db.prepare(`
        SELECT COUNT(*) AS cnt FROM records
        WHERE player_id = ? AND (record_type = '180' OR record_type = 'best_round_180')
      `).get(p.id)?.cnt || 0;

      const hatTrickCount = db.prepare(`
        SELECT COUNT(*) AS cnt FROM records
        WHERE player_id = ? AND record_type = 'hat_trick'
      `).get(p.id)?.cnt || 0;

      const shanghaiCount = db.prepare(`
        SELECT COUNT(*) AS cnt FROM records
        WHERE player_id = ? AND record_type = 'shanghai'
      `).get(p.id)?.cnt || 0;

      const leastDartsRow = db.prepare(`
        SELECT MIN(value) AS minVal FROM records
        WHERE player_id = ? AND (
          record_type = 'ho_one_least_darts'
          OR record_type LIKE 'ho_one_%_least_darts'
          OR record_type = 'Least Darts'
        )
      `).get(p.id);

      const cricketLeastRoundsRow = db.prepare(`
        SELECT MIN(value) AS minVal FROM records
        WHERE player_id = ? AND (
          record_type = 'cricket_least_rounds'
          OR record_type LIKE 'cricket_%_least_rounds'
          OR record_type = 'Least Rounds'
        )
      `).get(p.id);

      const cricketBestMPRRow = db.prepare(`
        SELECT MAX(value) AS maxVal FROM records
        WHERE player_id = ? AND (
          record_type = 'cricket_mpr'
          OR record_type LIKE 'cricket_%_mpr'
          OR record_type = 'Marks Per Round'
          OR record_type = 'mpr'
        )
      `).get(p.id);

      const bullHitsRow = db.prepare(`
        SELECT COUNT(*) AS cnt FROM dart_hits
        WHERE player_id = ? AND (hit = 'DB' OR hit = 'SB')
      `).get(p.id);

      const recentHits = db.prepare(`
        SELECT hit, COUNT(*) as hit_count
        FROM dart_hits
        WHERE player_id = ?
        GROUP BY hit
        ORDER BY hit_count DESC
        LIMIT 10
      `).all(p.id);

      const chimayHistory = db.prepare(`
        SELECT details AS triple, date FROM records
        WHERE player_id = ? AND record_type = 'chimay_bleu'
        ORDER BY id DESC
      `).all(p.id);

      const gamesMap = new Map();
      const partRows = db.prepare(`
        SELECT g.gamename, COUNT(DISTINCT gp.game_id) as gamesCount
        FROM game_participants gp
        JOIN games g ON gp.game_id = g.id
        WHERE gp.player_id = ?
        GROUP BY g.gamename
      `).all(p.id);

      for (const row of partRows) {
        gamesMap.set(row.gamename, {
          gamename: row.gamename,
          gamesPlayed: Number(row.gamesCount || 0),
          metrics: []
        });
      }

      const metricRows = db.prepare(`
        SELECT
          r.game_name AS gamename,
          COALESCE(rd.name, r.record_type) AS scorename,
          COUNT(DISTINCT r.game_id) AS gamesCount,
          MAX(r.value) AS maxScore,
          MIN(r.value) AS minScore,
          AVG(r.value) AS avgScore
        FROM records r
        LEFT JOIN record_definitions rd ON r.record_type = rd.id
        WHERE r.player_id = ? AND r.game_name != '*'
        GROUP BY r.game_name, scorename
        ORDER BY gamesCount DESC
      `).all(p.id);

      for (const row of metricRows) {
        if (!gamesMap.has(row.gamename)) {
          gamesMap.set(row.gamename, {
            gamename: row.gamename,
            gamesPlayed: Number(row.gamesCount || 0),
            metrics: []
          });
        }
        const gEntry = gamesMap.get(row.gamename);
        gEntry.gamesPlayed = Math.max(gEntry.gamesPlayed, Number(row.gamesCount || 0));
        gEntry.metrics.push({
          scorename: row.scorename,
          bestScore: Math.round(Number(row.maxScore || 0) * 100) / 100,
          minScore: Math.round(Number(row.minScore || 0) * 100) / 100,
          avgScore: Math.round(Number(row.avgScore || 0) * 100) / 100
        });
      }

      const byGame = Array.from(gamesMap.values()).sort((a, b) => b.gamesPlayed - a.gamesPlayed);
      const favoriteGame = byGame[0]?.gamename || null;
      const favoriteGameCount = byGame[0]?.gamesPlayed || 0;

      const favTripleRow = db.prepare(`
        SELECT hit, COUNT(*) as hit_count
        FROM dart_hits
        WHERE player_id = ? AND hit LIKE 'T%'
        GROUP BY hit
        ORDER BY hit_count DESC
        LIMIT 1
      `).get(p.id);

      const recentScores = db.prepare(`
        SELECT
          r.date AS date,
          r.game_name AS gamename,
          COALESCE(rd.name, r.record_type) AS scorename,
          r.value AS score
        FROM records r
        LEFT JOIN record_definitions rd ON r.record_type = rd.id
        WHERE r.player_id = ?
        ORDER BY r.id DESC
        LIMIT 25
      `).all(p.id);

      const allPlayerRecords = db.prepare(`
        SELECT
          r.record_type AS id,
          COALESCE(rd.game_name, r.game_name) AS game_name,
          COALESCE(rd.name, r.record_type) AS name,
          COALESCE(rd.unit, '') AS unit,
          COALESCE(rd.sort_order, 'DESC') AS sort_order,
          COALESCE(rd.calc_type, 'pattern') AS calc_type,
          COALESCE(rd.pattern, 'none') AS pattern,
          COUNT(r.id) AS count,
          MAX(r.value) AS max_val,
          MIN(r.value) AS min_val,
          AVG(r.value) AS avg_val,
          MAX(r.date) AS last_date,
          GROUP_CONCAT(DISTINCT r.details) AS details
        FROM records r
        LEFT JOIN record_definitions rd ON r.record_type = rd.id
        WHERE r.player_id = ?
        GROUP BY r.record_type
      `).all(p.id);

      const gamesPlayed = Number(p.games_played || 0);
      const wins = Number(p.wins || 0);
      const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

      return {
        id: p.id,
        name: p.name,
        gamesPlayed,
        wins,
        winRate,
        favoriteGame,
        favoriteGameCount,
        favoriteTriple: favTripleRow ? { hit: favTripleRow.hit, count: Number(favTripleRow.hit_count) } : null,
        avgPPR: (() => {
          let v = pprRow?.avgVal ? Number(pprRow.avgVal) : 0;
          if (v <= 0) {
            const h = db.prepare('SELECT AVG(score_value) * 3.0 AS avg3D FROM dart_hits WHERE player_id = ?').get(p.id);
            if (h?.avg3D) v = Number(h.avg3D);
            else {
              const part = db.prepare('SELECT (SUM(total_points) * 3.0 / SUM(darts_thrown)) AS avg3D FROM game_participants WHERE player_id = ? AND darts_thrown > 0').get(p.id);
              if (part?.avg3D) v = Number(part.avg3D);
            }
          }
          return Math.round(v * 10) / 10;
        })(),
        avg3DAllTime: (() => {
          let v = pprRow?.avgVal ? Number(pprRow.avgVal) : 0;
          if (v <= 0) {
            const h = db.prepare('SELECT AVG(score_value) * 3.0 AS avg3D FROM dart_hits WHERE player_id = ?').get(p.id);
            if (h?.avg3D) v = Number(h.avg3D);
            else {
              const part = db.prepare('SELECT (SUM(total_points) * 3.0 / SUM(darts_thrown)) AS avg3D FROM game_participants WHERE player_id = ? AND darts_thrown > 0').get(p.id);
              if (part?.avg3D) v = Number(part.avg3D);
            }
          }
          return Math.round(v * 10) / 10;
        })(),
        avgMPR: mprRow?.avgVal ? Math.round(Number(mprRow.avgVal) * 100) / 100 : 0,
        bestFinish: bestFinishRow?.maxVal ? Number(bestFinishRow.maxVal) : 0,
        leastDarts: leastDartsRow?.minVal ? Number(leastDartsRow.minVal) : null,
        cricketLeastRounds: cricketLeastRoundsRow?.minVal ? Number(cricketLeastRoundsRow.minVal) : null,
        cricketBestMPR: cricketBestMPRRow?.maxVal ? Math.round(Number(cricketBestMPRRow.maxVal) * 100) / 100 : null,
        bullHitsCount: Number(bullHitsRow?.cnt || 0),
        chimayCount: Number(chimayCount),
        ton80Count: Number(ton80Count),
        hatTrickCount: Number(hatTrickCount),
        shanghaiCount: Number(shanghaiCount),
        chimayHistory,
        byGame,
        recentScores,
        playerRecords: allPlayerRecords,
        lastPlayed: p.last_played || null,
        topHits: recentHits
      };
    } finally {
      db.close();
    }
  }
}
