/**
 * Module Schema & Migrations SQLite DartOTron (server/db/schema.js)
 * Gère le cycle de vie, la création et la synchronisation du schéma relationnel v2.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RECORD_DEFINITIONS, getGameVariantId } from './records.js';

export function initializeDatabase(db, pathDir, dbFile) {
  if (!fs.existsSync(pathDir)) {
    fs.mkdirSync(pathDir, { recursive: true });
  }

  db.exec(`
    PRAGMA foreign_keys = ON;

    -- Suivi des migrations
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      description TEXT NOT NULL
    );

    -- Joueurs avec identifiant unique
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL COLLATE NOCASE,
      games_played INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_played DATETIME
    );
    CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);

    -- État du Lobby
    CREATE TABLE IF NOT EXISTS lobby_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      selected_game TEXT NOT NULL DEFAULT 'Cricket',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lobby_players (
      player_id INTEGER PRIMARY KEY,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );

    -- Catalogue des définitions de records
    CREATE TABLE IF NOT EXISTS record_definitions (
      id TEXT PRIMARY KEY,
      game_name TEXT NOT NULL,
      game_variant TEXT DEFAULT NULL,
      record_type TEXT NOT NULL,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT '',
      sort_order TEXT NOT NULL DEFAULT 'DESC',
      is_highlight BOOLEAN NOT NULL DEFAULT 0,
      is_system BOOLEAN NOT NULL DEFAULT 0,
      pattern TEXT DEFAULT 'none',
      calc_type TEXT NOT NULL DEFAULT 'pattern',
      match_condition TEXT NOT NULL DEFAULT 'any',
      match_metric TEXT NOT NULL DEFAULT 'total_points'
    );
    CREATE INDEX IF NOT EXISTS idx_record_defs_game ON record_definitions(game_name);

    -- Table unifiée des records et accomplissements
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_name TEXT NOT NULL,
      game_variant TEXT DEFAULT NULL,
      record_type TEXT NOT NULL,
      player_id INTEGER NOT NULL,
      game_id INTEGER,
      value REAL NOT NULL,
      details TEXT,
      date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (record_type) REFERENCES record_definitions(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_records_lookup ON records(game_name, record_type);
    CREATE INDEX IF NOT EXISTS idx_records_player ON records(player_id);
    CREATE INDEX IF NOT EXISTS idx_records_val ON records(record_type, value);

    -- Parties jouées
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      gamename TEXT NOT NULL,
      gameoptions TEXT,
      nbplayers INTEGER NOT NULL DEFAULT 1,
      winner_id INTEGER,
      duration_seconds INTEGER,
      FOREIGN KEY (winner_id) REFERENCES players(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);
    CREATE INDEX IF NOT EXISTS idx_games_gamename ON games(gamename);

    -- Participants d'une partie
    CREATE TABLE IF NOT EXISTS game_participants (
      game_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      rank INTEGER NOT NULL DEFAULT 1,
      total_points INTEGER NOT NULL DEFAULT 0,
      darts_thrown INTEGER NOT NULL DEFAULT 0,
      stats TEXT,
      PRIMARY KEY (game_id, player_id),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_game_participants_player ON game_participants(player_id);

    -- Impacts de fléchettes permanents (après match terminé)
    CREATE TABLE IF NOT EXISTS dart_hits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      round_number INTEGER NOT NULL DEFAULT 1,
      dart_number INTEGER NOT NULL DEFAULT 1,
      hit TEXT NOT NULL,
      score_value INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_dart_hits_game ON dart_hits(game_id);
    CREATE INDEX IF NOT EXISTS idx_dart_hits_player ON dart_hits(player_id);
    CREATE INDEX IF NOT EXISTS idx_dart_hits_hit ON dart_hits(hit);
  `);

  // Migration dynamique des colonnes de record_definitions si nécessaire
  const recDefCols = db.prepare('PRAGMA table_info(record_definitions)').all();
  const recDefColSet = new Set(recDefCols.map(c => c.name));
  if (!recDefColSet.has('game_variant')) {
    db.exec("ALTER TABLE record_definitions ADD COLUMN game_variant TEXT DEFAULT NULL;");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_record_defs_variant ON record_definitions(game_name, game_variant);");
  if (!recDefColSet.has('calc_type')) {
    db.exec("ALTER TABLE record_definitions ADD COLUMN calc_type TEXT NOT NULL DEFAULT 'pattern';");
  }
  if (!recDefColSet.has('match_condition')) {
    db.exec("ALTER TABLE record_definitions ADD COLUMN match_condition TEXT NOT NULL DEFAULT 'any';");
  }
  if (!recDefColSet.has('match_metric')) {
    db.exec("ALTER TABLE record_definitions ADD COLUMN match_metric TEXT NOT NULL DEFAULT 'total_points';");
  }

  // Migration dynamique des colonnes de records si nécessaire
  const recCols = db.prepare('PRAGMA table_info(records)').all();
  const recColSet = new Set(recCols.map(c => c.name));
  if (!recColSet.has('game_variant')) {
    db.exec("ALTER TABLE records ADD COLUMN game_variant TEXT DEFAULT NULL;");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_records_variant ON records(game_name, game_variant, record_type);");

  // Insertion et mise à jour des définitions de records
  const insertRecDef = db.prepare(`
    INSERT INTO record_definitions (id, game_name, game_variant, record_type, name, unit, sort_order, is_highlight, is_system, pattern, calc_type, match_condition, match_metric)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      game_name = excluded.game_name,
      game_variant = excluded.game_variant,
      record_type = excluded.record_type,
      name = excluded.name,
      unit = excluded.unit,
      sort_order = excluded.sort_order,
      is_highlight = excluded.is_highlight,
      is_system = excluded.is_system,
      pattern = excluded.pattern,
      calc_type = excluded.calc_type,
      match_condition = excluded.match_condition,
      match_metric = excluded.match_metric
  `);
  for (const rd of RECORD_DEFINITIONS) {
    insertRecDef.run(
      rd.id,
      rd.game_name,
      rd.game_variant || null,
      rd.record_type,
      rd.name,
      rd.unit,
      rd.sort_order,
      rd.is_highlight,
      rd.is_system,
      rd.pattern,
      rd.calc_type || (rd.pattern && rd.pattern !== 'none' ? 'pattern' : 'match_result'),
      rd.match_condition || 'any',
      rd.match_metric || 'total_points'
    );
  }

  // Rétro-migration automatique des records existants vers leurs variantes
  try {
    // 1. Nettoyage / restauration des chimay_bleu corrompus qui avaient été convertis à tort en ho_one_%_least_darts
    db.prepare(`
      UPDATE records
      SET record_type = 'chimay_bleu', game_name = '*', game_variant = NULL
      WHERE details LIKE 'T%' AND (
        record_type LIKE 'ho_one_%' OR record_type = 'ho_one_least_darts' OR record_type = 'Least Darts'
      )
    `).run();

    // 2. Suppression de tout enregistrement least_darts impossible (< 3 fléchettes)
    db.prepare(`
      DELETE FROM records
      WHERE record_type LIKE '%least_darts%' AND value < 3
    `).run();

    // 3. Rétro-migration Ho_One vers les variantes précises
    const unmigratedHoOne = db.prepare(`
      SELECT r.id, r.record_type, g.gameoptions
      FROM records r
      LEFT JOIN games g ON r.game_id = g.id
      WHERE (r.game_name = 'Ho_One' OR r.record_type LIKE 'ho_one_%') AND (
        r.record_type IN ('ho_one_least_darts', 'Least Darts', 'least_darts', 'ho_one_ppr', 'Points Per Round', 'ppr', 'ho_one_best_finish', 'Best Finish', 'best_finish')
        OR r.record_type LIKE 'ho_one_%_least_darts'
        OR r.record_type LIKE 'ho_one_%_ppr'
        OR r.record_type LIKE 'ho_one_%_best_finish'
      )
    `).all();

    for (const row of unmigratedHoOne) {
      const variant = getGameVariantId('Ho_One', row.gameoptions) || '501';
      let metricSuffix = 'least_darts';
      const rType = String(row.record_type || '').toLowerCase();
      if (rType.includes('ppr') || rType.includes('points per round')) {
        metricSuffix = 'ppr';
      } else if (rType.includes('finish') || rType.includes('best finish')) {
        metricSuffix = 'best_finish';
      }
      const newTypeId = `ho_one_${variant}_${metricSuffix}`;
      db.prepare('UPDATE records SET record_type = ?, game_variant = ?, game_name = ? WHERE id = ?').run(newTypeId, variant, 'Ho_One', row.id);
    }

    // 4. Rétro-migration Cricket vers les variantes précises
    const unmigratedCricket = db.prepare(`
      SELECT r.id, r.record_type, g.gameoptions
      FROM records r
      LEFT JOIN games g ON r.game_id = g.id
      WHERE (r.game_name = 'Cricket' OR r.record_type LIKE 'cricket_%') AND (
        r.record_type IN ('cricket_mpr', 'Marks Per Round', 'mpr', 'cricket_least_rounds', 'Least Rounds')
        OR r.record_type LIKE 'cricket_%_mpr'
        OR r.record_type LIKE 'cricket_%_least_rounds'
      )
    `).all();

    for (const row of unmigratedCricket) {
      const variant = getGameVariantId('Cricket', row.gameoptions) || 'standard';
      let metricSuffix = 'mpr';
      const rType = String(row.record_type || '').toLowerCase();
      if (rType.includes('round') || rType.includes('least rounds') || rType.includes('tours')) {
        metricSuffix = 'least_rounds';
      }
      const newTypeId = `cricket_${variant}_${metricSuffix}`;
      db.prepare('UPDATE records SET record_type = ?, game_variant = ?, game_name = ? WHERE id = ?').run(newTypeId, variant, 'Cricket', row.id);
    }

    // 5. Rétro-alimentation des records système pour les parties terminées enregistrées dans game_participants
    const finishedHoOneParticipants = db.prepare(`
      SELECT gp.game_id, gp.player_id, gp.rank, gp.total_points, gp.darts_thrown, gp.stats, g.date, g.gameoptions
      FROM game_participants gp
      JOIN games g ON gp.game_id = g.id
      WHERE g.gamename = 'Ho_One' AND gp.stats IS NOT NULL
    `).all();

    for (const part of finishedHoOneParticipants) {
      const variant = getGameVariantId('Ho_One', part.gameoptions) || '501';
      let statsObj = {};
      try {
        statsObj = typeof part.stats === 'string' ? JSON.parse(part.stats) : part.stats;
      } catch {}

      const pprVal = Number(statsObj['Points Per Round'] || 0);
      if (pprVal > 0) {
        const pprDefId = `ho_one_${variant}_ppr`;
        const exists = db.prepare('SELECT id FROM records WHERE game_id = ? AND player_id = ? AND record_type = ?').get(part.game_id, part.player_id, pprDefId);
        if (!exists) {
          db.prepare('INSERT INTO records (game_name, game_variant, record_type, player_id, game_id, value, date) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run('Ho_One', variant, pprDefId, part.player_id, part.game_id, pprVal, part.date);
        }
      }

      const finishVal = Number(statsObj['Best Finish'] || 0);
      if (finishVal > 0 && part.rank === 1) {
        const finishDefId = `ho_one_${variant}_best_finish`;
        const exists = db.prepare('SELECT id FROM records WHERE game_id = ? AND player_id = ? AND record_type = ?').get(part.game_id, part.player_id, finishDefId);
        if (!exists) {
          db.prepare('INSERT INTO records (game_name, game_variant, record_type, player_id, game_id, value, date) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run('Ho_One', variant, finishDefId, part.player_id, part.game_id, finishVal, part.date);
        }
      }

      const dartsVal = Number(statsObj['Least Darts'] || part.darts_thrown || 0);
      if (dartsVal >= 3 && part.rank === 1) {
        const dartsDefId = `ho_one_${variant}_least_darts`;
        const exists = db.prepare('SELECT id FROM records WHERE game_id = ? AND player_id = ? AND record_type = ?').get(part.game_id, part.player_id, dartsDefId);
        if (!exists) {
          db.prepare('INSERT INTO records (game_name, game_variant, record_type, player_id, game_id, value, date) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run('Ho_One', variant, dartsDefId, part.player_id, part.game_id, dartsVal, part.date);
        }
      }
    }
  } catch (err) {
    console.error('Erreur migration rétroactive records variantes:', err);
  }

  // Nettoyage des anciennes définitions système obsolètes
  const validSysIds = RECORD_DEFINITIONS.filter(rd => rd.is_system === 1).map(rd => rd.id);
  if (validSysIds.length > 0) {
    const placeholders = validSysIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM record_definitions WHERE is_system = 1 AND id NOT IN (${placeholders})`).run(...validSysIds);
  }

  // Initialisation par défaut de l'état du lobby si vide
  db.prepare("INSERT OR IGNORE INTO lobby_state (id, selected_game) VALUES (1, 'Cricket')").run();

  // Initialisation par défaut des joueurs si table vide (un seul joueur par défaut)
  const pCount = db.prepare('SELECT COUNT(*) as cnt FROM players').get();
  if (!pCount || pCount.cnt === 0) {
    db.prepare("INSERT INTO players (name) VALUES ('Joueur 1')").run();
    const p1 = db.prepare("SELECT id FROM players WHERE name = 'Joueur 1'").get();
    if (p1) {
      db.prepare('INSERT OR IGNORE INTO lobby_players (player_id, order_index) VALUES (?, 0)').run(p1.id);
    }
  }

  db.prepare("INSERT OR IGNORE INTO schema_migrations (version, description) VALUES (2, 'v2 relational storage pure')").run();
}

