/**
 * Façade CScores DartOTron (server/scores.js)
 * Point d'entrée unique et transparent agrégeant les dépôts spécialisés de server/db/.
 * Maintient une compatibilité d'interface stricte à 100% avec le moteur de jeu et l'API.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { initializeDatabase } from './db/schema.js';
import {
  RECORD_DEFINITIONS,
  parseDartHit,
  checkTurnPattern,
  calculateHitScore,
  RecordsRepository
} from './db/records.js';
import { PlayersRepository } from './db/players.js';
import { MatchesRepository } from './db/matches.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.join(__dirname, '..', 'data');

export {
  RECORD_DEFINITIONS,
  parseDartHit,
  checkTurnPattern,
  calculateHitScore
};

export class CScores {
  constructor(config) {
    this.config = config;
    this.pathDir = config?.pathDir || process.env.DARTOTRON_DATA_DIR || DEFAULT_DATA_DIR;
    this.dbFile = path.join(this.pathDir, 'scores.db');
    this.game_id = null;
    this.gamename = '';
    this.gameoptions = '';
    this.nbplayers = 0;
    this.isFirstCreation = false;

    // Instanciation des dépôts
    this._recordsRepo = new RecordsRepository(() => this.getDb());
    this._playersRepo = new PlayersRepository(() => this.getDb());
    this._matchesRepo = new MatchesRepository(() => this.getDb(), (opts) => this.formatOptions(opts));

    this.initDB();
  }

  getDb() {
    const db = new DatabaseSync(this.dbFile);
    db.exec('PRAGMA foreign_keys = ON;');
    return db;
  }

  initDB() {
    if (!fs.existsSync(this.pathDir)) {
      fs.mkdirSync(this.pathDir, { recursive: true });
    }
    const isFirstTime = !fs.existsSync(this.dbFile);
    this.isFirstCreation = isFirstTime;
    const db = this.getDb();
    try {
      initializeDatabase(db, this.pathDir, this.dbFile);
    } finally {
      db.close();
    }
  }

  consumeFirstCreationFlag() {
    const val = Boolean(this.isFirstCreation);
    this.isFirstCreation = false;
    return val;
  }

  formatOptions(gameOpts) {
    if (typeof gameOpts === 'string') return gameOpts;
    let str = '';
    for (const [k, v] of Object.entries(gameOpts || {})) {
      str += `${k}=${v}|`;
    }
    return str;
  }

  // ==================== JOUEURS & LOBBY ====================
  GetPlayers() {
    return this._playersRepo.GetPlayers();
  }

  GetPlayer(idOrName) {
    return this._playersRepo.GetPlayer(idOrName);
  }

  AddPlayer(name) {
    return this._playersRepo.AddPlayer(name);
  }

  RenamePlayer(idOrName, newName) {
    return this._playersRepo.RenamePlayer(idOrName, newName);
  }

  DeletePlayer(idOrName) {
    return this._playersRepo.DeletePlayer(idOrName);
  }

  GetLobbyState() {
    return this._playersRepo.GetLobbyState();
  }

  SaveLobbyState(params) {
    return this._playersRepo.SaveLobbyState(params);
  }

  getPlayerHandicapStat(playerName, statType = 'PPD') {
    return this._playersRepo.getPlayerHandicapStat(playerName, statType);
  }

  GetPlayersStats(knownNames = []) {
    return this._playersRepo.GetPlayersStats(knownNames);
  }

  GetPlayerProfile(playerName) {
    return this._playersRepo.GetPlayerProfile(playerName);
  }

  // ==================== PARTIES & MATCHS ====================
  RecordCompletedMatch(params) {
    this.gamename = params.gameName;
    this.gameoptions = this.formatOptions(params.gameOptions);
    this.nbplayers = params.nbPlayers;
    const gameId = this._matchesRepo.RecordCompletedMatch(params);
    this.game_id = gameId;
    return gameId;
  }

  RecordMatchParticipation(playerNames = [], winnerName = null) {
    return this._matchesRepo.RecordMatchParticipation(playerNames, winnerName);
  }

  AddGame(params) {
    const gid = this._matchesRepo.AddGame(params);
    this.game_id = gid;
    return gid;
  }

  AddScore(params) {
    return this._matchesRepo.AddScore({
      ...params,
      gamename: params.gamename || this.gamename,
      gameoptions: params.gameoptions || this.gameoptions,
      game_id: params.game_id || this.game_id
    });
  }

  RecordDartHit(params) {
    return this._matchesRepo.RecordDartHit({ ...params, game_id: params.game_id || this.game_id, gamename: this.gamename });
  }

  GetGameHits(gameId) {
    return this._matchesRepo.GetGameHits(gameId);
  }

  // ==================== RECORDS & CATALOGUE ====================
  GetRecordDefinitions(gameName = null) {
    return this._recordsRepo.GetRecordDefinitions(gameName);
  }

  AddRecordDefinition(def) {
    return this._recordsRepo.AddRecordDefinition(def);
  }

  DeleteRecordDefinition(id) {
    return this._recordsRepo.DeleteRecordDefinition(id);
  }

  BackfillRecord(recordDefId) {
    return this._recordsRepo.BackfillRecord(recordDefId);
  }

  GetRecords(filter = {}) {
    return this._recordsRepo.GetRecords(filter);
  }

  AddRecord(params) {
    return this._recordsRepo.AddRecord(params);
  }

  DeleteRecord(id) {
    return this._recordsRepo.DeleteRecord(id);
  }

  GetScoreTable(scorename, orderby = 'DESC', current = false, gamename = null, gameoptions = null, gameId = null) {
    return this._recordsRepo.GetScoreTable(
      scorename,
      orderby,
      current,
      gamename ?? this.gamename,
      gameoptions ?? this.gameoptions,
      gameId ?? this.game_id
    );
  }

  GetAllRecords(gamename = null, limit = 25) {
    return this._recordsRepo.GetAllRecords(gamename ?? this.gamename, limit);
  }

  GetHallOfFame(options = {}) {
    return this._recordsRepo.GetHallOfFame(options);
  }

  // Rétrocompatibilité Chimay
  AddChimayRecord({ game_id = null, gamename = '', playername, triple }) {
    const p = this.GetPlayer(playername);
    if (!p) return null;
    return this._recordsRepo.AddRecord({
      game_name: gamename || this.gamename || '*',
      record_type: 'chimay_bleu',
      player_id: p.id,
      game_id: game_id || this.game_id,
      value: 1,
      details: String(triple || '')
    });
  }

  DeleteChimayRecord(id) {
    return this._recordsRepo.DeleteRecord(id);
  }

  GetAllChimayRecords(limit = 100) {
    const db = this.getDb();
    try {
      const history = db.prepare(`
        SELECT r.id, r.date, p.name AS playername, r.details AS triple, r.game_name AS gamename
        FROM records r
        JOIN players p ON r.player_id = p.id
        WHERE r.record_type = 'chimay_bleu'
        ORDER BY r.id DESC
        LIMIT ?
      `).all(Number(limit) || 100);

      const summaryRows = db.prepare(`
        SELECT
          p.name AS playername,
          COUNT(*) AS count,
          GROUP_CONCAT(r.details, ', ') AS triples,
          MAX(r.date) AS lastDate
        FROM records r
        JOIN players p ON r.player_id = p.id
        WHERE r.record_type = 'chimay_bleu'
        GROUP BY p.id
        ORDER BY count DESC, lastDate DESC
      `).all();

      return {
        leaderboard: summaryRows.map(r => ({
          playername: r.playername,
          count: Number(r.count || 0),
          triples: r.triples || '',
          lastDate: r.lastDate || null
        })),
        history: history.map(h => ({
          id: h.id,
          date: h.date,
          playername: h.playername,
          triple: h.triple,
          gamename: h.gamename
        }))
      };
    } finally {
      db.close();
    }
  }
}
