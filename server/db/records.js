/**
 * Module Records & Patterns DartOTron (server/db/records.js)
 * Catalogue des définitions de records, détection des motifs de volée et gestion des accomplissements.
 */

export const RECORD_DEFINITIONS = [
  // Définitions génériques de base (Rétrocompatibilité)
  { id: 'ho_one_ppr', game_name: 'Ho_One', game_variant: null, record_type: 'Points Per Round', name: 'Points Par Tour (PPR)', unit: 'pt', sort_order: 'DESC', is_highlight: 0, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'any', match_metric: 'ppr' },
  { id: 'ho_one_best_finish', game_name: 'Ho_One', game_variant: null, record_type: 'Best Finish', name: 'Meilleur Finish', unit: 'pts', sort_order: 'DESC', is_highlight: 0, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'best_finish' },
  { id: 'ho_one_least_darts', game_name: 'Ho_One', game_variant: null, record_type: 'Least Darts', name: 'Fléchettes pour Finir', unit: 'fléchettes', sort_order: 'ASC', is_highlight: 0, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'darts_thrown' },
  { id: 'cricket_mpr', game_name: 'Cricket', game_variant: null, record_type: 'Marks Per Round', name: 'Marks Par Tour (MPR)', unit: 'mkr', sort_order: 'DESC', is_highlight: 0, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'any', match_metric: 'mpr' },
  { id: 'cricket_least_rounds', game_name: 'Cricket', game_variant: null, record_type: 'Least Rounds', name: 'Tours pour Gagner', unit: 'tours', sort_order: 'ASC', is_highlight: 0, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'rounds' },

  // Ho_One (301)
  { id: 'ho_one_301_ppr', game_name: 'Ho_One', game_variant: '301', record_type: 'Points Per Round', name: 'Points Par Tour (301)', unit: 'pt', sort_order: 'DESC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'any', match_metric: 'ppr' },
  { id: 'ho_one_301_best_finish', game_name: 'Ho_One', game_variant: '301', record_type: 'Best Finish', name: 'Meilleur Finish (301)', unit: 'pts', sort_order: 'DESC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'best_finish' },
  { id: 'ho_one_301_least_darts', game_name: 'Ho_One', game_variant: '301', record_type: 'Least Darts', name: 'Fléchettes pour Finir (301)', unit: 'fléch.', sort_order: 'ASC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'darts_thrown' },

  // Ho_One (501)
  { id: 'ho_one_501_ppr', game_name: 'Ho_One', game_variant: '501', record_type: 'Points Per Round', name: 'Points Par Tour (501)', unit: 'pt', sort_order: 'DESC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'any', match_metric: 'ppr' },
  { id: 'ho_one_501_best_finish', game_name: 'Ho_One', game_variant: '501', record_type: 'Best Finish', name: 'Meilleur Finish (501)', unit: 'pts', sort_order: 'DESC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'best_finish' },
  { id: 'ho_one_501_least_darts', game_name: 'Ho_One', game_variant: '501', record_type: 'Least Darts', name: 'Fléchettes pour Finir (501)', unit: 'fléch.', sort_order: 'ASC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'darts_thrown' },

  // Ho_One (701)
  { id: 'ho_one_701_ppr', game_name: 'Ho_One', game_variant: '701', record_type: 'Points Per Round', name: 'Points Par Tour (701)', unit: 'pt', sort_order: 'DESC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'any', match_metric: 'ppr' },
  { id: 'ho_one_701_best_finish', game_name: 'Ho_One', game_variant: '701', record_type: 'Best Finish', name: 'Meilleur Finish (701)', unit: 'pts', sort_order: 'DESC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'best_finish' },
  { id: 'ho_one_701_least_darts', game_name: 'Ho_One', game_variant: '701', record_type: 'Least Darts', name: 'Fléchettes pour Finir (701)', unit: 'fléch.', sort_order: 'ASC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'darts_thrown' },

  // Ho_One (1001)
  { id: 'ho_one_1001_ppr', game_name: 'Ho_One', game_variant: '1001', record_type: 'Points Per Round', name: 'Points Par Tour (1001)', unit: 'pt', sort_order: 'DESC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'any', match_metric: 'ppr' },
  { id: 'ho_one_1001_best_finish', game_name: 'Ho_One', game_variant: '1001', record_type: 'Best Finish', name: 'Meilleur Finish (1001)', unit: 'pts', sort_order: 'DESC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'best_finish' },
  { id: 'ho_one_1001_least_darts', game_name: 'Ho_One', game_variant: '1001', record_type: 'Least Darts', name: 'Fléchettes pour Finir (1001)', unit: 'fléch.', sort_order: 'ASC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'darts_thrown' },

  // Cricket (Standard)
  { id: 'cricket_standard_mpr', game_name: 'Cricket', game_variant: 'standard', record_type: 'Marks Per Round', name: 'Marks Par Tour (Standard)', unit: 'mkr', sort_order: 'DESC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'any', match_metric: 'mpr' },
  { id: 'cricket_standard_least_rounds', game_name: 'Cricket', game_variant: 'standard', record_type: 'Least Rounds', name: 'Tours pour Gagner (Standard)', unit: 'tours', sort_order: 'ASC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'rounds' },

  // Cricket (Cut-Throat)
  { id: 'cricket_cutthroat_mpr', game_name: 'Cricket', game_variant: 'cutthroat', record_type: 'Marks Per Round', name: 'Marks Par Tour (Cut-Throat)', unit: 'mkr', sort_order: 'DESC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'any', match_metric: 'mpr' },
  { id: 'cricket_cutthroat_least_rounds', game_name: 'Cricket', game_variant: 'cutthroat', record_type: 'Least Rounds', name: 'Tours pour Gagner (Cut-Throat)', unit: 'tours', sort_order: 'ASC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'rounds' },

  // Cricket (Crazy)
  { id: 'cricket_crazy_mpr', game_name: 'Cricket', game_variant: 'crazy', record_type: 'Marks Per Round', name: 'Marks Par Tour (Crazy)', unit: 'mkr', sort_order: 'DESC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'any', match_metric: 'mpr' },
  { id: 'cricket_crazy_least_rounds', game_name: 'Cricket', game_variant: 'crazy', record_type: 'Least Rounds', name: 'Tours pour Gagner (Crazy)', unit: 'tours', sort_order: 'ASC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'rounds' },

  // Cricket (Crazy Master)
  { id: 'cricket_crazymaster_mpr', game_name: 'Cricket', game_variant: 'crazymaster', record_type: 'Marks Per Round', name: 'Marks Par Tour (Crazy Master)', unit: 'mkr', sort_order: 'DESC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'any', match_metric: 'mpr' },
  { id: 'cricket_crazymaster_least_rounds', game_name: 'Cricket', game_variant: 'crazymaster', record_type: 'Least Rounds', name: 'Tours pour Gagner (Crazy Master)', unit: 'tours', sort_order: 'ASC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'rounds' },

  // 321 Zlip
  { id: '321_zlips', game_name: '321_Zlip', game_variant: null, record_type: 'Zlips', name: 'Zlips Infligés', unit: 'fois', sort_order: 'DESC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'any', match_metric: 'zlips' },
  { id: '321_zlipped', game_name: '321_Zlip', game_variant: null, record_type: 'Zlipped', name: 'Zlips Subis', unit: 'fois', sort_order: 'ASC', is_highlight: 0, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'any', match_metric: 'zlipped' },

  // By Fives
  { id: 'by_fives_min_rounds', game_name: 'By_Fives', game_variant: null, record_type: 'Least Rounds', name: 'Tours pour Gagner', unit: 'tours', sort_order: 'ASC', is_highlight: 1, is_system: 1, pattern: 'none', calc_type: 'match_result', match_condition: 'win', match_metric: 'rounds' },

  // Global Multi-jeux
  { id: 'chimay_bleu', game_name: '*', game_variant: null, record_type: 'chimay_bleu', name: 'Chimay Bleu (3 × Triple)', unit: 'fois', sort_order: 'DESC', is_highlight: 1, is_system: 0, pattern: 'triples_same', calc_type: 'pattern', match_condition: 'any', match_metric: 'total_points' },
  { id: 'best_round_180', game_name: '*', game_variant: null, record_type: '180', name: 'Volée Maximale (180)', unit: 'fois', sort_order: 'DESC', is_highlight: 1, is_system: 0, pattern: 'ton_80', calc_type: 'pattern', match_condition: 'any', match_metric: 'total_points' },
  { id: 'hat_trick', game_name: '*', game_variant: null, record_type: 'hat_trick', name: 'Hat-Trick (3 Bulls)', unit: 'fois', sort_order: 'DESC', is_highlight: 1, is_system: 0, pattern: 'hat_trick', calc_type: 'pattern', match_condition: 'any', match_metric: 'total_points' },
  { id: 'shanghai', game_name: '*', game_variant: null, record_type: 'shanghai', name: 'Shanghai (S+D+T)', unit: 'fois', sort_order: 'DESC', is_highlight: 1, is_system: 0, pattern: 'shanghai', calc_type: 'pattern', match_condition: 'any', match_metric: 'total_points' },

  // Préférences & Affinités (Uniquement dans les statistiques joueurs, non affichées dans le Général)
  { id: 'fav_triple', game_name: '*', game_variant: null, record_type: 'fav_triple', name: 'Triple Préféré', unit: 'touches', sort_order: 'DESC', is_highlight: 0, is_system: 1, pattern: 'fav_triple', calc_type: 'preference', match_condition: 'any', match_metric: 'total_points' },
  { id: 'fav_game', game_name: '*', game_variant: null, record_type: 'fav_game', name: 'Jeu Préféré', unit: 'parties', sort_order: 'DESC', is_highlight: 0, is_system: 1, pattern: 'fav_game', calc_type: 'preference', match_condition: 'any', match_metric: 'total_points' }
];

export function parseGameOptions(gameoptions) {
  if (!gameoptions) return {};
  if (typeof gameoptions === 'object') return gameoptions;
  if (typeof gameoptions !== 'string') return {};
  const trimmed = gameoptions.trim();
  if (trimmed.startsWith('{')) {
    try { return JSON.parse(trimmed); } catch {}
  }
  // Format pipe-séparé clé=valeur|clé=valeur|...
  const result = {};
  trimmed.split('|').forEach(part => {
    const eqIdx = part.indexOf('=');
    if (eqIdx !== -1) {
      const k = part.slice(0, eqIdx).trim();
      const v = part.slice(eqIdx + 1).trim();
      if (k) result[k] = v;
    }
  });
  return result;
}

export function getGameVariantId(gamename, gameoptions = {}) {
  if (!gamename) return null;
  const opts = parseGameOptions(gameoptions);

  if (gamename === 'Ho_One') {
    const start = String(opts.startingat || '501');
    return ['301', '501', '701', '1001'].includes(start) ? start : '501';
  }
  if (gamename === 'Cricket') {
    if (String(opts.optioncrazycutthroatmaster) === 'True' || opts.optioncrazycutthroatmaster === true) return 'crazymaster';
    if (String(opts.optioncrazy) === 'True' || opts.optioncrazy === true) return 'crazy';
    if (String(opts.optioncutthroat) === 'True' || opts.optioncutthroat === true) return 'cutthroat';
    return 'standard';
  }
  return null;
}

export function parseDartHit(hit) {
  if (!hit || hit === 'MISSDART' || hit === 'MISS') return { mult: 0, num: 0, isBull: false };
  if (hit === 'DB') return { mult: 2, num: 25, isBull: true };
  if (hit === 'SB') return { mult: 1, num: 25, isBull: true };
  const m = hit.match(/^([SDT])(\d+)$/);
  if (!m) return { mult: 0, num: 0, isBull: false };
  return {
    mult: m[1] === 'T' ? 3 : (m[1] === 'D' ? 2 : 1),
    num: parseInt(m[2], 10),
    isBull: false
  };
}

export function checkTurnPattern(pattern, roundHistory) {
  if (!pattern || pattern === 'none') return false;
  if (!Array.isArray(roundHistory) || roundHistory.length !== 3) return false;
  if (roundHistory.some(h => !h || h === 'MISSDART' || h === 'MISS')) return false;

  const parsed = roundHistory.map(parseDartHit);
  if (parsed.some(p => p.mult === 0)) return false;

  switch (pattern) {
    case 'triples_same':
      return parsed.every(p => p.mult === 3 && p.num === parsed[0].num);

    case 'triples_any':
      return parsed.every(p => p.mult === 3);

    case 'hat_trick':
      return parsed.every(p => p.isBull);

    case 'ton_80':
      return parsed.every(p => p.mult === 3 && p.num === 20);

    case 'consecutive_suite': {
      const nums = parsed.map(p => p.num);
      const sorted = [...nums].sort((a, b) => a - b);
      return sorted[1] === sorted[0] + 1 && sorted[2] === sorted[1] + 1;
    }

    case 'shanghai': {
      const nums = parsed.map(p => p.num);
      if (nums[0] !== nums[1] || nums[1] !== nums[2]) return false;
      const mults = parsed.map(p => p.mult).sort((a, b) => a - b);
      return mults[0] === 1 && mults[1] === 2 && mults[2] === 3;
    }

    case 'simple_double_triple': {
      const mults = parsed.map(p => p.mult).sort((a, b) => a - b);
      return mults[0] === 1 && mults[1] === 2 && mults[2] === 3;
    }

    default:
      return false;
  }
}

export function calculateHitScore(hit) {
  if (!hit || hit === 'MISSDART' || hit === 'MISSED' || hit.startsWith('PLAYER') || hit.startsWith('GAME')) {
    return 0;
  }
  if (hit === 'DB') return 50;
  if (hit === 'SB') return 25;
  const match = hit.match(/^([SDT])(\d+)$/);
  if (!match) return 0;
  const mult = match[1] === 'T' ? 3 : (match[1] === 'D' ? 2 : 1);
  const num = parseInt(match[2], 10);
  return mult * num;
}

export class RecordsRepository {
  constructor(getDb) {
    this.getDb = getDb;
  }

  GetRecordDefinitions(gameName = null) {
    const db = this.getDb();
    try {
      if (gameName && gameName !== '*') {
        return db.prepare(`
          SELECT * FROM record_definitions
          WHERE game_name = ? OR game_name = '*'
          ORDER BY is_system DESC, name ASC
        `).all(gameName);
      }
      return db.prepare('SELECT * FROM record_definitions ORDER BY game_name ASC, is_system DESC, name ASC').all();
    } finally {
      db.close();
    }
  }

  AddRecordDefinition({
    id,
    game_name,
    record_type,
    name,
    unit = '',
    sort_order = 'DESC',
    is_highlight = 0,
    is_system = 0,
    pattern = 'none',
    calc_type = 'pattern',
    match_condition = 'any',
    match_metric = 'total_points'
  }) {
    const cleanId = String(id || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanId) throw new Error('ID de record invalide');
    const db = this.getDb();
    try {
      db.prepare(`
        INSERT INTO record_definitions (id, game_name, record_type, name, unit, sort_order, is_highlight, is_system, pattern, calc_type, match_condition, match_metric)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          unit = excluded.unit,
          sort_order = excluded.sort_order,
          is_highlight = excluded.is_highlight,
          pattern = excluded.pattern,
          calc_type = excluded.calc_type,
          match_condition = excluded.match_condition,
          match_metric = excluded.match_metric
      `).run(
        cleanId,
        game_name || '*',
        record_type || cleanId,
        name || cleanId,
        unit,
        sort_order === 'ASC' ? 'ASC' : 'DESC',
        is_highlight ? 1 : 0,
        is_system ? 1 : 0,
        pattern || 'none',
        calc_type || 'pattern',
        match_condition || 'any',
        match_metric || 'total_points'
      );
      return { id: cleanId, success: true };
    } finally {
      db.close();
    }
  }

  DeleteRecordDefinition(id) {
    const db = this.getDb();
    try {
      const def = db.prepare('SELECT is_system FROM record_definitions WHERE id = ?').get(id);
      if (def && def.is_system === 1) {
        throw new Error('Impossible de supprimer un type de record système');
      }
      db.prepare('DELETE FROM record_definitions WHERE id = ?').run(id);
      return { success: true };
    } finally {
      db.close();
    }
  }

  BackfillRecord(recordDefId) {
    const db = this.getDb();
    try {
      const def = db.prepare('SELECT * FROM record_definitions WHERE id = ?').get(recordDefId);
      if (!def) return 0;

      // 1. MOTIF DE VOLÉE (pattern)
      const isPattern = def.calc_type === 'pattern' || (def.pattern && def.pattern !== 'none' && !['fav_triple', 'fav_game', 'fav_double', 'fav_number'].includes(def.pattern));
      if (isPattern) {
        let query = `
          SELECT dh.game_id, dh.player_id, dh.round_number, dh.dart_number, dh.hit, g.gamename, g.date
          FROM dart_hits dh
          JOIN games g ON dh.game_id = g.id
        `;
        const params = [];
        if (def.game_name !== '*') {
          query += ' WHERE g.gamename = ?';
          params.push(def.game_name);
        }
        query += ' ORDER BY dh.game_id ASC, dh.player_id ASC, dh.round_number ASC, dh.dart_number ASC';

        const rows = db.prepare(query).all(...params);
        const turns = new Map();
        for (const r of rows) {
          const key = `${r.game_id}_${r.player_id}_${r.round_number}`;
          if (!turns.has(key)) {
            turns.set(key, {
              game_id: r.game_id,
              player_id: r.player_id,
              gamename: r.gamename,
              date: r.date,
              hits: []
            });
          }
          turns.get(key).hits.push(r.hit);
        }

        const insertRecord = db.prepare(`
          INSERT INTO records (game_name, record_type, player_id, game_id, value, details, date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const checkDuplicate = db.prepare(`
          SELECT COUNT(*) as cnt FROM records
          WHERE record_type = ? AND game_id = ? AND player_id = ? AND details = ?
        `);

        let count = 0;
        db.exec('BEGIN TRANSACTION;');
        for (const turn of turns.values()) {
          if (turn.hits.length !== 3) continue;
          if (checkTurnPattern(def.pattern, turn.hits)) {
            const details = def.id === 'chimay_bleu' ? turn.hits[0] : turn.hits.join(', ');
            const dup = checkDuplicate.get(def.id, turn.game_id, turn.player_id, details);
            if (!dup || dup.cnt === 0) {
              insertRecord.run(
                def.game_name,
                def.id,
                turn.player_id,
                turn.game_id,
                1,
                details,
                turn.date || new Date().toISOString()
              );
              count += 1;
            }
          }
        }
        db.exec('COMMIT;');
        return count;
      }

      // 2. RÉSULTAT DE MATCH (match_result)
      if (def.calc_type === 'match_result') {
        let query = `
          SELECT gp.player_id, gp.game_id, gp.rank, gp.total_points, gp.darts_thrown, gp.stats, g.gamename, g.date
          FROM game_participants gp
          JOIN games g ON gp.game_id = g.id
        `;
        const whereClauses = [];
        const params = [];
        if (def.game_name && def.game_name !== '*') {
          whereClauses.push('g.gamename = ?');
          params.push(def.game_name);
        }
        if (def.match_condition === 'win') {
          whereClauses.push('gp.rank = 1');
        } else if (def.match_condition === 'loss') {
          whereClauses.push('gp.rank > 1');
        }
        if (whereClauses.length > 0) {
          query += ' WHERE ' + whereClauses.join(' AND ');
        }
        query += ' ORDER BY gp.game_id ASC';

        const rows = db.prepare(query).all(...params);
        const insertRecord = db.prepare(`
          INSERT INTO records (game_name, record_type, player_id, game_id, value, details, date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const checkDuplicate = db.prepare(`
          SELECT COUNT(*) as cnt FROM records
          WHERE record_type = ? AND game_id = ? AND player_id = ?
        `);

        let count = 0;
        db.exec('BEGIN TRANSACTION;');
        for (const r of rows) {
          let val = 0;
          if (def.match_metric === 'total_points') {
            val = Number(r.total_points || 0);
          } else if (def.match_metric === 'darts_thrown') {
            val = Number(r.darts_thrown || 0);
          } else {
            val = Number(r.total_points || 0);
          }

          const dup = checkDuplicate.get(def.id, r.game_id, r.player_id);
          if (!dup || dup.cnt === 0) {
            const det = r.rank === 1 ? 'Victoire' : `Défaite (#${r.rank})`;
            insertRecord.run(
              r.gamename || def.game_name,
              def.id,
              r.player_id,
              r.game_id,
              val,
              det,
              r.date || new Date().toISOString()
            );
            count += 1;
          }
        }
        db.exec('COMMIT;');
        return count;
      }

      // 3. PRÉFÉRENCE / AFFINITÉ (preference)
      if (def.calc_type === 'preference' || ['fav_triple', 'fav_game', 'fav_double', 'fav_number'].includes(def.pattern)) {
        const prefType = def.pattern || def.id;
        let count = 0;
        db.exec('BEGIN TRANSACTION;');
        db.prepare('DELETE FROM records WHERE record_type = ?').run(def.id);

        const insertPrefRecord = db.prepare(`
          INSERT INTO records (game_name, record_type, player_id, game_id, value, details, date)
          VALUES (?, ?, ?, NULL, ?, ?, CURRENT_TIMESTAMP)
        `);

        if (prefType === 'fav_triple') {
          const rows = db.prepare(`
            SELECT player_id, hit, COUNT(*) as hit_count
            FROM dart_hits
            WHERE hit LIKE 'T%'
            GROUP BY player_id, hit
            ORDER BY player_id, hit_count DESC
          `).all();

          const topPerPlayer = new Map();
          for (const r of rows) {
            if (!topPerPlayer.has(r.player_id)) {
              topPerPlayer.set(r.player_id, r);
            }
          }
          for (const [pid, r] of topPerPlayer.entries()) {
            insertPrefRecord.run(def.game_name, def.id, pid, r.hit_count, r.hit);
            count += 1;
          }
        } else if (prefType === 'fav_game') {
          const rows = db.prepare(`
            SELECT gp.player_id, g.gamename, COUNT(DISTINCT gp.game_id) as games_count
            FROM game_participants gp
            JOIN games g ON gp.game_id = g.id
            GROUP BY gp.player_id, g.gamename
            ORDER BY gp.player_id, games_count DESC
          `).all();

          const topPerPlayer = new Map();
          for (const r of rows) {
            if (!topPerPlayer.has(r.player_id)) {
              topPerPlayer.set(r.player_id, r);
            }
          }
          for (const [pid, r] of topPerPlayer.entries()) {
            insertPrefRecord.run(def.game_name, def.id, pid, r.games_count, r.gamename);
            count += 1;
          }
        } else if (prefType === 'fav_double') {
          const rows = db.prepare(`
            SELECT player_id, hit, COUNT(*) as hit_count
            FROM dart_hits
            WHERE hit LIKE 'D%'
            GROUP BY player_id, hit
            ORDER BY player_id, hit_count DESC
          `).all();

          const topPerPlayer = new Map();
          for (const r of rows) {
            if (!topPerPlayer.has(r.player_id)) {
              topPerPlayer.set(r.player_id, r);
            }
          }
          for (const [pid, r] of topPerPlayer.entries()) {
            insertPrefRecord.run(def.game_name, def.id, pid, r.hit_count, r.hit);
            count += 1;
          }
        } else if (prefType === 'fav_number') {
          const rows = db.prepare(`
            SELECT player_id,
                   CASE
                     WHEN hit IN ('DB', 'SB') THEN 'Bull'
                     WHEN hit LIKE 'S%' OR hit LIKE 'D%' OR hit LIKE 'T%' THEN SUBSTR(hit, 2)
                     ELSE hit
                   END as num_target,
                   COUNT(*) as hit_count
            FROM dart_hits
            WHERE hit != 'MISSDART' AND hit != 'MISS'
            GROUP BY player_id, num_target
            ORDER BY player_id, hit_count DESC
          `).all();

          const topPerPlayer = new Map();
          for (const r of rows) {
            if (!topPerPlayer.has(r.player_id)) {
              topPerPlayer.set(r.player_id, r);
            }
          }
          for (const [pid, r] of topPerPlayer.entries()) {
            insertPrefRecord.run(def.game_name, def.id, pid, r.hit_count, r.num_target);
            count += 1;
          }
        }
        db.exec('COMMIT;');
        return count;
      }

      return 0;
    } catch (err) {
      try { db.exec('ROLLBACK;'); } catch (_) {}
      throw err;
    } finally {
      db.close();
    }
  }

  GetRecords({ gameName = null, recordType = null, playerId = null, limit = 50 } = {}) {
    const db = this.getDb();
    try {
      let sql = `
        SELECT
          r.id,
          r.game_name,
          r.record_type,
          COALESCE(rd.name, r.record_type) AS record_name,
          COALESCE(rd.unit, '') AS record_unit,
          COALESCE(rd.sort_order, 'DESC') AS sort_order,
          r.player_id,
          p.name AS player_name,
          r.game_id,
          r.value,
          r.details,
          r.date
        FROM records r
        JOIN players p ON r.player_id = p.id
        LEFT JOIN record_definitions rd ON (r.record_type = rd.id OR (r.record_type = rd.record_type AND (rd.game_name = r.game_name OR rd.game_name = '*')))
        WHERE 1=1
      `;
      const params = [];
      if (gameName) {
        sql += " AND (r.game_name = ? OR r.game_name = '*')";
        params.push(gameName);
      }
      if (recordType) {
        sql += ' AND (r.record_type = ? OR rd.id = ? OR rd.record_type = ?)';
        params.push(recordType, recordType, recordType);
      }
      if (playerId) {
        sql += ' AND r.player_id = ?';
        params.push(Number(playerId));
      }
      sql += ' ORDER BY r.id DESC LIMIT ?';
      params.push(Number(limit) || 50);

      return db.prepare(sql).all(...params);
    } finally {
      db.close();
    }
  }

  AddRecord({ game_name = '*', record_type, player_id, game_id = null, value = 1, details = null }) {
    const db = this.getDb();
    try {
      const res = db.prepare(`
        INSERT INTO records (game_name, record_type, player_id, game_id, value, details, date)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(game_name, record_type, player_id, game_id, value, details);
      return Number(res.lastInsertRowid);
    } finally {
      db.close();
    }
  }

  DeleteRecord(id) {
    const db = this.getDb();
    try {
      db.prepare('DELETE FROM records WHERE id = ?').run(Number(id));
      return true;
    } finally {
      db.close();
    }
  }

  GetScoreTable(scorename, orderby = 'DESC', current = false, gamename = null, gameoptions = null, gameId = null) {
    const dir = String(orderby).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const db = this.getDb();
    try {
      const variant = getGameVariantId(gamename, gameoptions);
      let sql = `
        SELECT
          CASE r.game_id WHEN ? THEN 1 ELSE 0 END AS hiscore,
          r.date AS date,
          p.name AS playername,
          r.value AS score
        FROM records r
        JOIN players p ON r.player_id = p.id
        LEFT JOIN record_definitions rd ON r.record_type = rd.id
        LEFT JOIN games g ON r.game_id = g.id
        WHERE 1=1
      `;
      const params = [gameId ?? -1];

      if (gamename && gamename !== '*') {
        sql += " AND (r.game_name = ? OR r.game_name = '*')";
        params.push(gamename);
      }
      if (variant) {
        sql += " AND (r.game_variant = ? OR rd.game_variant = ?)";
        params.push(variant, variant);
      }
      if (scorename) {
        sql += ` AND (
          r.record_type = ?
          OR rd.record_type = ?
          OR rd.name = ?
          OR rd.id = ?
        )`;
        params.push(scorename, scorename, scorename, scorename);
      }
      if (current && gameId !== null) {
        sql += ' AND r.game_id = ?';
        params.push(gameId);
      }

      sql += ` ORDER BY r.value ${dir} LIMIT 12`;
      return db.prepare(sql).all(...params);
    } finally {
      db.close();
    }
  }

  GetAllRecords(gamename = null, limit = 25) {
    const db = this.getDb();
    try {
      let sql = `
        SELECT
          r.id,
          r.date,
          r.game_name AS gamename,
          COALESCE(g.gameoptions, '') AS gameoptions,
          COALESCE(rd.name, r.record_type) AS scorename,
          p.name AS playername,
          r.value AS score
        FROM records r
        JOIN players p ON r.player_id = p.id
        LEFT JOIN games g ON r.game_id = g.id
        LEFT JOIN record_definitions rd ON r.record_type = rd.id
        WHERE 1=1
      `;
      const params = [];
      if (gamename && gamename !== '*') {
        sql += " AND (r.game_name = ? OR r.game_name = '*')";
        params.push(gamename);
      }
      sql += ' ORDER BY r.id DESC LIMIT ?';
      params.push(Number(limit) || 25);
      return db.prepare(sql).all(...params);
    } finally {
      db.close();
    }
  }

  GetHallOfFame(options = {}) {
    const db = this.getDb();
    try {
      const hoOneVariant = options.hoOneVariant || options.ho_one_variant || '501';
      const cricketVariant = options.cricketVariant || options.cricket_variant || 'standard';

      const cricketLabels = {
        standard: 'STANDARD',
        cutthroat: 'CUT-THROAT',
        crazy: 'CRAZY',
        crazymaster: 'CRAZY MASTER'
      };

      const categories = [
        {
          id: `ho_one_${hoOneVariant}_ppr`,
          game_name: 'Ho_One',
          game_variant: hoOneVariant,
          title: 'Points Par Tour (PPR)',
          badge: `X01 • ${hoOneVariant}`,
          icon: 'speed',
          color: 'neon',
          unit: 'pt',
          query: `
            SELECT p.name AS playername, r.value AS score, r.details AS details, r.date
            FROM records r
            JOIN players p ON r.player_id = p.id
            LEFT JOIN record_definitions rd ON r.record_type = rd.id
            WHERE (r.record_type = ? OR (rd.record_type = 'Points Per Round' AND (r.game_variant = ? OR rd.game_variant = ?)))
            ORDER BY r.value DESC LIMIT 3
          `,
          params: [`ho_one_${hoOneVariant}_ppr`, hoOneVariant, hoOneVariant]
        },
        {
          id: `ho_one_${hoOneVariant}_best_finish`,
          game_name: 'Ho_One',
          game_variant: hoOneVariant,
          title: 'Meilleur Finish',
          badge: `X01 • ${hoOneVariant}`,
          icon: 'check_circle',
          color: 'neon',
          unit: 'pts',
          query: `
            SELECT p.name AS playername, r.value AS score, r.details AS details, r.date
            FROM records r
            JOIN players p ON r.player_id = p.id
            LEFT JOIN record_definitions rd ON r.record_type = rd.id
            WHERE (r.record_type = ? OR (rd.record_type = 'Best Finish' AND (r.game_variant = ? OR rd.game_variant = ?)))
            ORDER BY r.value DESC LIMIT 3
          `,
          params: [`ho_one_${hoOneVariant}_best_finish`, hoOneVariant, hoOneVariant]
        },
        {
          id: `ho_one_${hoOneVariant}_least_darts`,
          game_name: 'Ho_One',
          game_variant: hoOneVariant,
          title: 'Moins de Fléchettes',
          badge: `X01 • ${hoOneVariant}`,
          icon: 'bolt',
          color: 'neon',
          unit: 'fléch.',
          query: `
            SELECT p.name AS playername, r.value AS score, r.details AS details, r.date
            FROM records r
            JOIN players p ON r.player_id = p.id
            LEFT JOIN record_definitions rd ON r.record_type = rd.id
            WHERE (r.record_type = ? OR (rd.record_type = 'Least Darts' AND (r.game_variant = ? OR rd.game_variant = ?)))
            ORDER BY r.value ASC LIMIT 3
          `,
          params: [`ho_one_${hoOneVariant}_least_darts`, hoOneVariant, hoOneVariant]
        },
        {
          id: `cricket_${cricketVariant}_mpr`,
          game_name: 'Cricket',
          game_variant: cricketVariant,
          title: 'Marks Par Tour (MPR)',
          badge: `CRK • ${cricketLabels[cricketVariant] || cricketVariant.toUpperCase()}`,
          icon: 'radar',
          color: 'cyan',
          unit: 'mkr',
          query: `
            SELECT p.name AS playername, r.value AS score, r.details AS details, r.date
            FROM records r
            JOIN players p ON r.player_id = p.id
            LEFT JOIN record_definitions rd ON r.record_type = rd.id
            WHERE (r.record_type = ? OR (rd.record_type = 'Marks Per Round' AND (r.game_variant = ? OR rd.game_variant = ?)))
            ORDER BY r.value DESC LIMIT 3
          `,
          params: [`cricket_${cricketVariant}_mpr`, cricketVariant, cricketVariant]
        },
        {
          id: `cricket_${cricketVariant}_least_rounds`,
          game_name: 'Cricket',
          game_variant: cricketVariant,
          title: 'Tours pour Gagner',
          badge: `CRK • ${cricketLabels[cricketVariant] || cricketVariant.toUpperCase()}`,
          icon: 'timer',
          color: 'cyan',
          unit: 'tours',
          query: `
            SELECT p.name AS playername, r.value AS score, r.details AS details, r.date
            FROM records r
            JOIN players p ON r.player_id = p.id
            LEFT JOIN record_definitions rd ON r.record_type = rd.id
            WHERE (r.record_type = ? OR (rd.record_type = 'Least Rounds' AND (r.game_variant = ? OR rd.game_variant = ?)))
            ORDER BY r.value ASC LIMIT 3
          `,
          params: [`cricket_${cricketVariant}_least_rounds`, cricketVariant, cricketVariant]
        },
        {
          id: 'chimay_bleu',
          game_name: '*',
          game_variant: null,
          title: 'Chimay Bleu (3×Triple)',
          badge: 'MULTI-JEUX',
          icon: 'sports_bar',
          color: 'amber',
          unit: '×',
          query: `
            SELECT p.name AS playername, COUNT(*) AS score, NULL AS details, MAX(r.date) AS date
            FROM records r
            JOIN players p ON r.player_id = p.id
            WHERE r.record_type = 'chimay_bleu'
            GROUP BY p.id
            ORDER BY score DESC LIMIT 3
          `,
          params: []
        },
        {
          id: '180',
          game_name: '*',
          game_variant: null,
          title: 'Volée Maximale (180)',
          badge: 'MULTI-JEUX',
          icon: 'stars',
          color: 'neon',
          unit: '×',
          query: `
            SELECT p.name AS playername, COUNT(*) AS score, NULL AS details, MAX(r.date) AS date
            FROM records r
            JOIN players p ON r.player_id = p.id
            WHERE (r.record_type = '180' OR r.record_type = 'best_round_180')
            GROUP BY p.id
            ORDER BY score DESC LIMIT 3
          `,
          params: []
        },
        {
          id: 'hat_trick',
          game_name: '*',
          game_variant: null,
          title: 'Hat-Trick (3 Bulls)',
          badge: 'MULTI-JEUX',
          icon: 'adjust',
          color: 'cyan',
          unit: '×',
          query: `
            SELECT p.name AS playername, COUNT(*) AS score, NULL AS details, MAX(r.date) AS date
            FROM records r
            JOIN players p ON r.player_id = p.id
            WHERE r.record_type = 'hat_trick'
            GROUP BY p.id
            ORDER BY score DESC LIMIT 3
          `,
          params: []
        },
        {
          id: 'shanghai',
          game_name: '*',
          game_variant: null,
          title: 'Shanghai (S+D+T)',
          badge: 'MULTI-JEUX',
          icon: 'flag',
          color: 'amber',
          unit: '×',
          query: `
            SELECT p.name AS playername, COUNT(*) AS score, NULL AS details, MAX(r.date) AS date
            FROM records r
            JOIN players p ON r.player_id = p.id
            WHERE r.record_type = 'shanghai'
            GROUP BY p.id
            ORDER BY score DESC LIMIT 3
          `,
          params: []
        }
      ];

      const baseResult = categories.map(cat => {
        const rows = db.prepare(cat.query).all(...(cat.params || []));
        return {
          id: cat.id,
          game_name: cat.game_name,
          variant: cat.game_variant,
          title: cat.title,
          badge: cat.badge,
          icon: cat.icon,
          color: cat.color,
          unit: cat.unit,
          records: rows.map((r, idx) => ({
            rank: idx + 1,
            playername: r.playername,
            score: r.score,
            details: r.details || null,
            date: r.date,
            hiscore: idx === 0
          }))
        };
      });

      // Récupérer les définitions additionnelles personnalisées avec is_highlight = 1 (en excluant les préférences système)
      const standardIds = new Set(RECORD_DEFINITIONS.map(c => c.id));
      const extraDefs = db.prepare(`
        SELECT * FROM record_definitions
        WHERE is_highlight = 1 AND is_system = 0 AND id NOT IN ('fav_triple', 'fav_game')
        ORDER BY is_system DESC, name ASC
      `).all().filter(d => !standardIds.has(d.id));

      const extraCards = [];
      for (const ed of extraDefs) {
        let rows = [];
        if (ed.calc_type === 'preference' || ['fav_triple', 'fav_game', 'fav_double', 'fav_number'].includes(ed.pattern)) {
          if (ed.pattern === 'fav_triple' || ed.id === 'fav_triple') {
            const rawRows = db.prepare(`
              SELECT p.name AS playername, dh.hit AS details, COUNT(*) AS score, MAX(dh.created_at) AS date
              FROM dart_hits dh
              JOIN players p ON dh.player_id = p.id
              WHERE dh.hit LIKE 'T%'
              GROUP BY p.id, dh.hit
              ORDER BY p.id, score DESC
            `).all();
            const topMap = new Map();
            for (const r of rawRows) {
              if (!topMap.has(r.playername)) topMap.set(r.playername, r);
            }
            rows = [...topMap.values()].sort((a, b) => b.score - a.score).slice(0, 3);
          } else if (ed.pattern === 'fav_game' || ed.id === 'fav_game') {
            const rawRows = db.prepare(`
              SELECT p.name AS playername, g.gamename AS details, COUNT(DISTINCT gp.game_id) AS score, MAX(g.date) AS date
              FROM game_participants gp
              JOIN games g ON gp.game_id = g.id
              JOIN players p ON gp.player_id = p.id
              GROUP BY p.id, g.gamename
              ORDER BY p.id, score DESC
            `).all();
            const topMap = new Map();
            for (const r of rawRows) {
              if (!topMap.has(r.playername)) topMap.set(r.playername, r);
            }
            rows = [...topMap.values()].sort((a, b) => b.score - a.score).slice(0, 3);
          } else {
            rows = db.prepare(`
              SELECT p.name AS playername, r.value AS score, r.details AS details, r.date
              FROM records r
              JOIN players p ON r.player_id = p.id
              WHERE r.record_type = ?
              ORDER BY r.value ${ed.sort_order === 'ASC' ? 'ASC' : 'DESC'} LIMIT 3
            `).all(ed.id);
          }
        } else {
          rows = db.prepare(`
            SELECT p.name AS playername, r.value AS score, r.details AS details, r.date
            FROM records r
            JOIN players p ON r.player_id = p.id
            WHERE r.record_type = ?
            ORDER BY r.value ${ed.sort_order === 'ASC' ? 'ASC' : 'DESC'} LIMIT 3
          `).all(ed.id);
        }

        const isLoss = ed.calc_type === 'match_result' && ed.match_condition === 'loss';
        const isPref = ed.calc_type === 'preference' || ['fav_triple', 'fav_game', 'fav_double', 'fav_number'].includes(ed.pattern);

        extraCards.push({
          id: ed.id,
          game_name: ed.game_name,
          variant: ed.game_variant,
          title: ed.name,
          badge: ed.game_name === '*' ? (isPref ? 'PRÉFÉRENCE' : 'MULTI-JEUX') : ed.game_name.toUpperCase(),
          icon: isPref ? 'favorite' : (isLoss ? 'sentiment_dissatisfied' : 'military_tech'),
          color: isPref ? 'amber' : (isLoss ? 'crimson' : (ed.game_name === 'Ho_One' ? 'neon' : (ed.game_name === 'Cricket' ? 'cyan' : 'amber'))),
          unit: ed.unit,
          records: rows.map((r, idx) => ({
            rank: idx + 1,
            playername: r.playername,
            score: r.score,
            details: r.details || null,
            date: r.date,
            hiscore: idx === 0
          }))
        });
      }

      const allCards = [...baseResult, ...extraCards];
      const hoOneCards = allCards.filter(c => c.game_name === 'Ho_One');
      const cricketCards = allCards.filter(c => c.game_name === 'Cricket');
      const multiCards = allCards.filter(c => c.game_name !== 'Ho_One' && c.game_name !== 'Cricket');

      allCards.categories = allCards;
      allCards.sections = {
        ho_one: {
          activeVariant: hoOneVariant,
          variants: [
            { id: '301', label: '301' },
            { id: '501', label: '501' },
            { id: '701', label: '701' },
            { id: '1001', label: '1001' }
          ],
          categories: hoOneCards
        },
        cricket: {
          activeVariant: cricketVariant,
          variants: [
            { id: 'standard', label: 'Standard' },
            { id: 'cutthroat', label: 'Cut-Throat' },
            { id: 'crazy', label: 'Crazy' },
            { id: 'crazymaster', label: 'Crazy Master' }
          ],
          categories: cricketCards
        },
        multi: {
          categories: multiCards
        }
      };

      return allCards;
    } finally {
      db.close();
    }
  }
}

