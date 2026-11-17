import { EventEmitter } from 'node:events';
import { GAMES_REGISTRY } from '../games/index.js';
import { ORDERED_DART_KEYS } from '../config.js';
import { lang } from '../locale.js';
import { checkTurnPattern } from '../scores.js';
import { getGameVariantId } from '../db/records.js';

const WINNER_SOUNDS = [
  'victory'
];

export class MatchEngine extends EventEmitter {
  constructor(config, scores) {
    super();
    this.config = config;
    this.scores = scores;
    this.logs = {
      Log: (level, msg) => {
        const cfgLevel = Number(this.config.GetValue('SectionGlobals', 'debuglevel') || 2);
        const map = { DEBUG: 1, WARNING: 2, ERROR: 3, FATAL: 4 };
        if ((map[level] || 1) >= cfgLevel) {
          console.log(`[${level}] ${msg}`);
        }
      }
    };

    this.reset();
  }

  reset() {
    this.status = 'lobby'; // 'lobby' | 'playing' | 'waiting_player' | 'finished'
    this.gameId = null;
    this.gameTitle = '';
    this.gameOpts = {};
    this.objGame = null;
    this.players = [];
    this.actualround = 1;
    this.actualplayer = 0;
    this.playerlaunch = 1;
    this.lastHit = null;
    this.roundHistory = []; // Darts thrown in current turn
    this.eventsQueue = []; // Sounds, messages, TTS for frontend
    this.winner = null;
    this.endReason = null;
    this.recordsResult = [];
    this.Teaming = false;
    this.lastTurnChimayId = null;
    this.hitSeq = 0;
    this.matchHitsBuffer = [];
    this.matchRecordsBuffer = [];
    this.matchStartedAt = null;
    this.lastWaitingPlayerExitAt = 0;
  }

  createDisplayProxy() {
    const self = this;
    return {
      get Teaming() {
        return self.Teaming;
      },
      set Teaming(val) {
        self.Teaming = Boolean(val);
      },
      PlaySound(name) {
        if (!name) return;
        self.eventsQueue.push({ type: 'sound', name: String(name) });
      },
      Sound4Touch(touch) {
        if (!touch) return;
        if (touch === 'DB') {
          self.eventsQueue.push({ type: 'sound', name: 'doublebullseye' });
        } else if (touch === 'SB') {
          self.eventsQueue.push({ type: 'sound', name: 'bullseye' });
        } else {
          self.eventsQueue.push({ type: 'sound', name: String(touch) });
        }
      },
      SoundStartRound(_playerName) {
        // Round start audio handled via UI sounds
      },
      SoundEndGame(_playerName) {
        const s = WINNER_SOUNDS[Math.floor(Math.random() * WINNER_SOUNDS.length)];
        self.eventsQueue.push({ type: 'sound', name: s });
      },
      InfoMessage(txts, wait = 2000, color = null, pos = 'middle', size = 'big') {
        const text = Array.isArray(txts) ? txts.join(' — ') : String(txts);
        self.eventsQueue.push({
          type: 'message',
          text,
          duration: wait !== undefined && wait !== null ? wait : 2000,
          color,
          pos,
          size
        });
      }
    };
  }

  startMatch({ gameId, players, options = {} }) {
    const reg = GAMES_REGISTRY[gameId];
    if (!reg) {
      throw new Error(`Jeu inconnu : ${gameId}`);
    }
    const mod = reg.module;
    const playerNames = Array.isArray(players) && players.length > 0
      ? players.map(p => String(p).trim()).filter(Boolean)
      : ['Joueur 1'];

    // Normalize options to string 'True'/'False' or string numbers as expected by games
    const mergedOpts = { ...mod.GameOpts };
    for (const [k, v] of Object.entries(options)) {
      if (typeof v === 'boolean') {
        mergedOpts[k] = v ? 'True' : 'False';
      } else {
        mergedOpts[k] = String(v);
      }
    }

    this.reset();
    this.status = 'playing';
    this.gameId = gameId;
    this.gameTitle = reg.title;
    this.gameOpts = mergedOpts;
    this.displayProxy = this.createDisplayProxy();
    this.matchStartedAt = new Date().toISOString();

    // Save game options in config
    this.config.data[gameId] = { ...mergedOpts };
    this.config.save();

    // Persist lobby selection in database (not in dartotron.json)
    if (this.scores?.SaveLobbyState) {
      try {
        this.scores.SaveLobbyState({
          selectedGame: gameId,
          playerNames
        });
      } catch (e) {
        this.logs.Log('WARNING', `Lobby state persist error: ${e.message}`);
      }
    }

    const NuPl = playerNames.length;
    this.players = [];
    for (let x = 0; x < NuPl; x++) {
      const p = new mod.CPlayerExtended(x, NuPl, this.config);
      p.PlayerName = playerNames[x];
      this.players.push(p);
    }

    this.objGame = new mod.Game(
      this.displayProxy,
      gameId,
      NuPl,
      this.gameOpts,
      this.config,
      this.logs,
      this.scores
    );

    try {
      this.objGame.CheckHandicap(this.players);
    } catch (e) {
      this.logs.Log('WARNING', `Handicap non applicable: ${e.message}`);
    }

    this.actualround = 1;
    this.actualplayer = 0;
    this.playerlaunch = 1;
    this.roundHistory = [];

    this.runPreDartLoop();
    this.displayProxy.SoundStartRound(this.players[this.actualplayer].PlayerName);

    return this.getStateAndFlushEvents();
  }

  restartMatch() {
    if (!this.gameId || !this.objGame || this.players.length === 0) {
      throw new Error('Aucune partie précédente à relancer');
    }
    let nextPlayers = this.players.map(p => p.PlayerName);
    try {
      const ordered = this.objGame.DefineNextGameOrder(this.players);
      if (Array.isArray(ordered) && ordered.length === this.players.length) {
        nextPlayers = ordered;
      }
    } catch {
      // keep same order
    }
    return this.startMatch({
      gameId: this.gameId,
      players: nextPlayers,
      options: this.gameOpts
    });
  }

  runPreDartLoop() {
    let safety = 0;
    while (safety < 50 && this.status === 'playing') {
      safety++;
      const preCode = this.objGame.PreDartsChecks(
        this.players,
        this.actualround,
        this.actualplayer,
        this.playerlaunch
      );

      // Return code 4: player is not allowed to play (e.g. eliminated in Killer)
      if (preCode === 4) {
        this.advanceToNextPlayer(false);
        continue;
      }
      if (preCode === 3 && this.objGame.winner !== -1) {
        this.finishMatch('victory', this.objGame.winner);
        break;
      }
      if (preCode === 2) {
        this.finishMatch('max_rounds', this.objGame.winner !== -1 ? this.objGame.winner : null);
        break;
      }
      break;
    }
  }

  handleInput(rawKey) {
    if (this.status !== 'playing' && this.status !== 'waiting_player') {
      return this.getStateAndFlushEvents();
    }

    let DartStroke = String(rawKey || '').toUpperCase().trim();
    if (!DartStroke) return this.getStateAndFlushEvents();

    // Handle JOKER (random valid dart segment)
    if (DartStroke === 'JOKER') {
      const validSegments = ORDERED_DART_KEYS.slice(0, 62); // S20..DB
      DartStroke = validSegments[Math.floor(Math.random() * validSegments.length)];
    }

    // Always allow GAMEBUTTON (abort match)
    if (DartStroke === 'GAMEBUTTON') {
      this.displayProxy.InfoMessage([lang('Game interrupted')], 2500, 'orange', 'middle', 'big');
      this.finishMatch('interrupted', null);
      return this.getStateAndFlushEvents();
    }

    // Allow BACKUPBUTTON (undo turn)
    if (DartStroke === 'BACKUPBUTTON') {
      if (this.actualplayer === 0 && this.actualround === 1 && this.playerlaunch === 1 && this.status !== 'waiting_player') {
        this.displayProxy.InfoMessage(['Impossible de revenir en arrière au tout premier lancer !'], 1500, 'orange');
        return this.getStateAndFlushEvents();
      }
      this.performBackupTurn();
      return this.getStateAndFlushEvents();
    }

    // If waiting for PLAYERBUTTON / player turn transition
    if (this.status === 'waiting_player') {
      if (DartStroke === 'PLAYERBUTTON' || DartStroke === 'WAITING_PLAYER_ADVANCE') {
        this.status = 'playing';
        this.lastWaitingPlayerExitAt = Date.now();
        this.advanceToNextPlayer(true);
        this.runPreDartLoop();
        if (this.status === 'playing') {
          this.displayProxy.SoundStartRound(this.players[this.actualplayer].PlayerName);
        }
      }
      return this.getStateAndFlushEvents();
    }

    // Ignore late WAITING_PLAYER_ADVANCE timers arriving after transition has already occurred
    if (DartStroke === 'WAITING_PLAYER_ADVANCE') {
      return this.getStateAndFlushEvents();
    }

    // Standard playing state
    let PostDarts = -1;
    let EarlyPlayerButton = -1;
    let MissedDart = -1;

    const isSpecialButton = ['PLAYERBUTTON', 'BACKUPBUTTON', 'GAMEBUTTON', 'EXTRABUTTON', 'MISSDART'].includes(DartStroke);
    const isValidSegment = DartStroke in this.objGame.ScoreMap;

    if (!isSpecialButton && isValidSegment) {
      if (this.playerlaunch === 1) {
        this.lastTurnChimayId = null;
      }
      const prevScore = Number(this.players[this.actualplayer]?.score ?? 0);
      const prevEventsLen = this.eventsQueue.length;

      this.lastHit = {
        id: ++this.hitSeq,
        key: DartStroke,
        player: this.players[this.actualplayer].PlayerName,
        playerIdent: this.actualplayer,
        round: this.actualround,
        dart: this.playerlaunch,
        points: this.objGame.ScoreMap[DartStroke],
        status: 'scored',
        reason: 'scored',
        penalty: 0
      };
      this.roundHistory.push(DartStroke);

      try {
        PostDarts = this.objGame.PostDartsChecks(
          DartStroke,
          this.players,
          this.actualround,
          this.actualplayer,
          this.playerlaunch
        );
      } catch (err) {
        this.logs.Log('ERROR', `Error in PostDartsChecks: ${err.message}`);
        PostDarts = -1;
        MissedDart = 0;
        DartStroke = 'MISSDART';
      }

      // Évaluation contextuelle de la touche pour l'animation d'impact (scored / penalty / neutral)
      if (PostDarts !== -1 && this.lastHit) {
        const newEvents = this.eventsQueue.slice(prevEventsLen);
        const hasFailSound = newEvents.some(e => e.type === 'sound' && e.name === 'fail');
        const hasTouchSound = newEvents.some(e => e.type === 'sound' && e.name !== 'fail');
        const newScore = Number(this.players[this.actualplayer]?.score ?? 0);
        const scoreDelta = newScore - prevScore;

        let hitStatus = 'neutral';
        let hitReason = 'ignored';
        let hitPenalty = 0;

        if (this.gameId === 'By_Fives') {
          if (this.playerlaunch < 3 || scoreDelta > 0 || PostDarts === 3) {
            hitStatus = 'scored';
            hitReason = 'scored';
          } else {
            hitStatus = 'penalty';
            hitReason = 'not_multiple_5';
          }
        } else if (this.gameId === '321_Zlip') {
          if (PostDarts === 1) {
            hitStatus = 'penalty';
            hitReason = 'bust';
          } else if (hasTouchSound || PostDarts === 3 || this.blinkText === 'ZLIPPÉ !') {
            hitStatus = 'scored';
            hitReason = 'scored';
          }
        } else if (this.gameId === 'Cricket') {
          if (hasTouchSound || PostDarts === 3) {
            hitStatus = 'scored';
            hitReason = 'scored';
          } else if (scoreDelta > 0) {
            hitStatus = 'penalty';
            hitReason = 'penalty';
            hitPenalty = scoreDelta;
          } else {
            hitStatus = 'neutral';
            hitReason = 'ignored';
          }
        } else if (this.gameId === 'Ho_One') {
          if (hasFailSound) {
            hitStatus = 'penalty';
            hitReason = 'bust';
          } else if (hasTouchSound || PostDarts === 3) {
            hitStatus = 'scored';
            hitReason = 'scored';
          } else {
            hitStatus = 'neutral';
            hitReason = 'double_in';
          }
        } else {
          if (hasFailSound) {
            hitStatus = 'penalty';
            hitReason = 'bust';
          } else if (hasTouchSound || PostDarts === 3) {
            hitStatus = 'scored';
            hitReason = 'scored';
          } else {
            hitStatus = 'neutral';
            hitReason = 'ignored';
          }
        }

        this.lastHit.status = hitStatus;
        this.lastHit.reason = hitReason;
        this.lastHit.penalty = hitPenalty;
      }

      // Buffer hit in RAM (committed to DB only when game finishes)
      const bypassStats = Boolean(this.config.GetValue('SectionAdvanced', 'bypass-stats'));
      if (!bypassStats && PostDarts !== -1) {
        this.matchHitsBuffer.push({
          playerIndex: this.actualplayer,
          playerName: this.players[this.actualplayer].PlayerName,
          roundNumber: this.actualround,
          dartNumber: this.playerlaunch,
          hit: DartStroke,
          scoreValue: this.objGame.ScoreMap[DartStroke] ?? 0,
          createdAt: new Date().toISOString()
        });
      }

      // Détection des records basés sur des figures/motifs de volée (Chimay Bleu, 180, Suite, Shanghai, Hat-trick...)
      if (this.roundHistory.length === 3 && PostDarts !== -1 && !bypassStats && this.scores?.GetRecordDefinitions) {
        try {
          const defs = this.scores.GetRecordDefinitions(this.gameId);
          const patternDefs = defs.filter(d => d.pattern && d.pattern !== 'none');
          const pName = this.players[this.actualplayer].PlayerName;

          for (const recDef of patternDefs) {
            if (checkTurnPattern(recDef.pattern, this.roundHistory)) {
              this.displayProxy.PlaySound('victory');
              const volDetails = this.roundHistory.join(' — ');
              this.displayProxy.InfoMessage([`${recDef.name.toUpperCase()} ! (${volDetails})`], 3200, '#38bdf8', 'middle', 'huge');

              const recDetails = recDef.id === 'chimay_bleu' ? this.roundHistory[0] : this.roundHistory.join(', ');

              this.matchRecordsBuffer.push({
                gameName: this.gameId,
                recordType: recDef.id,
                playerIndex: this.actualplayer,
                playerName: pName,
                roundNumber: this.actualround,
                value: 1,
                details: recDetails,
                date: new Date().toISOString()
              });
            }
          }
        } catch (err) {
          this.logs.Log('ERROR', `Erreur détection pattern records: ${err.message}`);
        }
      }
    } else if (DartStroke === 'MISSDART') {
      const penalty = this.objGame && typeof this.objGame.GetMissPenalty === 'function'
        ? Number(this.objGame.GetMissPenalty(this.players, this.actualplayer, this.playerlaunch) || 0)
        : 0;
      this.lastHit = {
        id: ++this.hitSeq,
        key: 'MISSDART',
        player: this.players[this.actualplayer].PlayerName,
        playerIdent: this.actualplayer,
        round: this.actualround,
        dart: this.playerlaunch,
        points: penalty,
        penalty,
        status: 'penalty',
        reason: penalty > 0 ? 'penalty' : 'miss'
      };
      this.roundHistory.push('MISS');
      const bypassStats = Boolean(this.config.GetValue('SectionAdvanced', 'bypass-stats'));
      if (!bypassStats) {
        this.matchHitsBuffer.push({
          playerIndex: this.actualplayer,
          playerName: this.players[this.actualplayer].PlayerName,
          roundNumber: this.actualround,
          dartNumber: this.playerlaunch,
          hit: 'MISSDART',
          scoreValue: 0,
          createdAt: new Date().toISOString()
        });
      }
      try {
        MissedDart = this.objGame.MissButtonPressed(
          this.players,
          this.actualplayer,
          this.actualround,
          this.playerlaunch
        );
      } catch {
        MissedDart = 0;
      }
    } else if (DartStroke === 'PLAYERBUTTON') {
      // Déduplication : empêche un double PLAYERBUTTON rapproché juste après la sortie de waiting_player de sauter le tour suivant
      if (
        this.playerlaunch === 1 &&
        this.lastWaitingPlayerExitAt > 0 &&
        Date.now() - this.lastWaitingPlayerExitAt < 800
      ) {
        return this.getStateAndFlushEvents();
      }
      this.objGame.NotFisnished(this.players, this.actualplayer, this.actualround, this.playerlaunch);
      try {
        EarlyPlayerButton = this.objGame.EarlyPlayerButton(
          this.players,
          this.actualplayer,
          this.actualround
        );
      } catch {
        EarlyPlayerButton = 1;
      }
    } else {
      return this.getStateAndFlushEvents();
    }

    // Check Victory (return code 3)
    if (PostDarts === 3 || EarlyPlayerButton === 3 || MissedDart === 3) {
      if (this.objGame?.isDraw) {
        this.displayProxy.SoundEndGame('');
        this.displayProxy.InfoMessage(['MATCH NUL !'], 3500, 'yellow', 'middle', 'huge');
        this.finishMatch('draw', null);
      } else {
        const winIdx = this.objGame.winner !== -1 ? this.objGame.winner : this.actualplayer;
        const winPlayer = this.players[winIdx] || this.players[this.actualplayer];
        this.displayProxy.SoundEndGame(winPlayer.PlayerName);
        this.displayProxy.InfoMessage([`Victoire : ${winPlayer.PlayerName} !`], 3500, 'green', 'middle', 'huge');
        this.finishMatch('victory', winIdx);
      }
      return this.getStateAndFlushEvents();
    }

    // Check Game Over / Max round reached (return code 2)
    if (PostDarts === 2 || EarlyPlayerButton === 2 || MissedDart === 2) {
      this.displayProxy.InfoMessage([lang('last-round-reached')], 3000, 'orange', 'middle', 'big');
      const winIdx = this.objGame.winner !== -1 ? this.objGame.winner : null;
      this.finishMatch('max_rounds', winIdx);
      return this.getStateAndFlushEvents();
    }

    const maxDartsThisRound = this.objGame && typeof this.objGame.getMaxDartsForRound === 'function'
      ? this.objGame.getMaxDartsForRound(this.actualround, this.actualplayer)
      : (this.objGame ? Number(this.objGame.nbdarts) : 3);

    // Advance dart counter or wait for player change
    const turnEndedByDart = this.playerlaunch >= maxDartsThisRound || PostDarts === 1 || EarlyPlayerButton === 1;

    if (DartStroke === 'PLAYERBUTTON' || turnEndedByDart) {
      // Turn ended (either early button press, all darts thrown, or bust/zapped):
      // Lock dart inputs and wait for next player with releasedartstime
      this.status = 'waiting_player';
      const releaseTime = Number(this.config.GetValue('SectionGlobals', 'releasedartstime') || 10000);
      const releaseText = lang('release-darts');
      const existingMsgIdx = this.eventsQueue.findIndex(e => e.type === 'message');
      if (existingMsgIdx !== -1) {
        const existingMsg = this.eventsQueue[existingMsgIdx];
        existingMsg.text = `${existingMsg.text} — ${releaseText}`;
        existingMsg.duration = releaseTime;
      } else {
        this.displayProxy.InfoMessage([releaseText], releaseTime);
      }
    } else {
      this.playerlaunch += 1;
      this.runPreDartLoop();
    }

    return this.getStateAndFlushEvents();
  }

  performBackupTurn() {
    const NuPl = this.players.length;
    let RestoreSession = null;

    if (this.status === 'waiting_player') {
      this.status = 'playing';
      RestoreSession = this.objGame.BackUpPlayer;
    } else if (this.playerlaunch === 1) {
      RestoreSession = this.objGame.PreviousBackUpPlayer;
      if (this.actualround === 1 && this.actualplayer === 0) {
        this.actualround = 1;
        this.actualplayer = 0;
      } else if (this.actualplayer === 0) {
        this.actualround = Math.max(1, this.actualround - 1);
        this.actualplayer = NuPl - 1;
      } else {
        this.actualplayer = this.actualplayer - 1;
      }
    } else {
      RestoreSession = this.objGame.BackUpPlayer;
    }

    if (RestoreSession) {
      this.displayProxy.InfoMessage([lang('Backup Turn !')], 1500, 'orange', 'middle', 'big');
      this.players = RestoreSession.map(p => p.clone());
      this.playerlaunch = 1;
      this.roundHistory = [];
      this.runPreDartLoop();

      // Prune RAM buffered hits & records for the undone turn
      const targetRound = this.actualround;
      const targetPlayer = this.actualplayer;
      this.matchHitsBuffer = this.matchHitsBuffer.filter(h => {
        if (h.roundNumber > targetRound) return false;
        if (h.roundNumber === targetRound && h.playerIndex >= targetPlayer) return false;
        return true;
      });
      this.matchRecordsBuffer = this.matchRecordsBuffer.filter(r => {
        if (r.roundNumber > targetRound) return false;
        if (r.roundNumber === targetRound && r.playerIndex >= targetPlayer) return false;
        return true;
      });
    }
  }

  advanceToNextPlayer() {
    this.actualplayer += 1;
    this.playerlaunch = 1;
    this.roundHistory = [];
    if (this.actualplayer >= this.players.length) {
      this.actualplayer = 0;
      this.actualround += 1;
    }
  }

  finishMatch(reason, winnerIdx = null) {
    this.status = 'finished';
    this.endReason = reason;
    this.winner = winnerIdx !== null && winnerIdx !== -1 && this.players[winnerIdx]
      ? {
          ident: winnerIdx,
          PlayerName: this.players[winnerIdx].PlayerName,
          score: this.players[winnerIdx].score
        }
      : null;

    // Save stats to SQLite unless bypass-stats is enabled or match was interrupted
    const bypassStats = Boolean(this.config.GetValue('SectionAdvanced', 'bypass-stats'));
    this.recordsResult = [];

    if (!bypassStats && this.objGame && reason !== 'interrupted') {
      try {
        const endedAt = new Date().toISOString();
        const durationSeconds = this.matchStartedAt
          ? Math.max(1, Math.round((new Date(endedAt).getTime() - new Date(this.matchStartedAt).getTime()) / 1000))
          : 0;

        const participants = this.players.map((p, idx) => {
          let rank = 2;
          if (reason === 'draw') {
            const isFinisher = this.objGame?.finishers?.some(f => f.player === idx) ?? (p.score === 0);
            rank = isFinisher ? 1 : 2;
          } else {
            rank = idx === winnerIdx ? 1 : 2;
          }
          return {
            name: p.PlayerName,
            rank,
            totalPoints: p.TotalPoints || p.score || 0,
            dartsThrown: p.dartsThrown || p.dartsthrown || p.Stats?.total_darts || p.Stats?.['Least Darts'] || 0,
            stats: p.Stats || {}
          };
        });

        if (this.scores?.RecordCompletedMatch) {
          const gameId = this.scores.RecordCompletedMatch({
            gameName: this.gameId,
            gameOptions: this.gameOpts,
            nbPlayers: this.players.length,
            winnerName: this.winner?.PlayerName || null,
            startedAt: this.matchStartedAt,
            endedAt,
            durationSeconds,
            participants,
            hits: this.matchHitsBuffer,
            records: this.matchRecordsBuffer
          });
          this.scores.game_id = gameId;
        } else {
          this.scores.RecordMatchParticipation(
            this.players.map(p => p.PlayerName),
            this.winner?.PlayerName || null
          );
        }

        this.objGame.GameStats(this.players, this.actualround, this.scores);

        const matchVariant = getGameVariantId(this.gameId, this.gameOpts);
        for (const [scorename, orderby] of Object.entries(this.objGame.GameRecords || {})) {
          const currentTable = this.scores.GetScoreTable(scorename, orderby, true, this.gameId, this.gameOpts, this.scores.game_id);
          const allTimeTable = this.scores.GetScoreTable(scorename, orderby, false, this.gameId, this.gameOpts, this.scores.game_id);
          this.recordsResult.push({
            scorename,
            variant: matchVariant,
            label: lang(scorename, scorename),
            orderby,
            current: currentTable,
            allTime: allTimeTable
          });
        }
      } catch (err) {
        this.logs.Log('ERROR', `Erreur sauvegarde statistiques: ${err.message}`);
      }
    }
  }

  getStateAndFlushEvents() {
    const events = [...this.eventsQueue];
    this.eventsQueue = [];

    const activeOptions = [];
    if (this.gameOpts) {
      for (const [k, v] of Object.entries(this.gameOpts)) {
        if (k === 'max_round' || k === 'totalround') continue;
        if (String(v) === 'False') continue;
        const label = lang(`${this.gameId}-${k}`, k);
        activeOptions.push({
          key: k,
          label,
          value: String(v) === 'True' ? true : v
        });
      }
    }

    return {
      status: this.status,
      gameId: this.gameId,
      variant: getGameVariantId(this.gameId, this.gameOpts),
      gameTitle: this.gameTitle,
      headers: this.objGame ? this.objGame.Headers.slice(0, this.objGame.nbcol + 1) : [],
      nbcol: this.objGame ? this.objGame.nbcol : 6,
      actualround: this.actualround,
      maxround: this.objGame ? Number(this.objGame.maxround) : 20,
      actualplayer: this.actualplayer,
      playerlaunch: this.playerlaunch,
      nbdarts: this.objGame ? Number(this.objGame.nbdarts) : 3,
      remainingDarts: this.status === 'waiting_player'
        ? 0
        : Math.max(0, (this.objGame && typeof this.objGame.getMaxDartsForRound === 'function'
            ? this.objGame.getMaxDartsForRound(this.actualround, this.actualplayer)
            : (this.objGame ? Number(this.objGame.nbdarts) : 3)) - this.playerlaunch + 1),
      teaming: this.Teaming,
      activeOptions,
      gameOptions: this.gameOpts || {},
      missPenalty: this.objGame && typeof this.objGame.GetMissPenalty === 'function'
        ? this.objGame.GetMissPenalty(this.players, this.actualplayer, this.playerlaunch)
        : 0,
      players: this.players.map(p => p.toJSON(this.actualround)),
      lastHit: this.lastHit,
      roundHistory: this.roundHistory,
      winner: this.winner,
      endReason: this.endReason,
      records: this.recordsResult,
      events
    };
  }
}
