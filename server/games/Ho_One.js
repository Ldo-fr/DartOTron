import { CPlayer } from '../engine/CPlayer.js';
import { CGame } from '../engine/CGame.js';
import { CHandicap } from '../engine/CHandicap.js';

export const Headers = ['D1', 'D2', 'D3', '', 'Rnd', 'PPD', 'PPR'];
export const GameOpts = {
  startingat: '501',
  max_round: '20',
  double_in: 'False',
  double_out: 'False',
  split_bull: 'True',
  equal: 'False'
};
export const GameRecords = {
  'Points Per Round': 'DESC',
  'Best Finish': 'DESC',
  'Least Darts': 'ASC'
};
export const nbdarts = 3;

export class CPlayerExtended extends CPlayer {
  constructor(x, NbPlayers, Config) {
    super(x, NbPlayers, Config);
    this.PrePlayScore = null;
    this.Frozen = false;
    for (const GR of Object.keys(GameRecords)) {
      this.Stats[GR] = '0';
    }
  }
}

export class Game extends CGame {
  constructor(myDisplay, GameChoice, nbplayers, GameOptsIn, Config, Logs, Scores) {
    super(myDisplay, GameChoice, nbplayers, GameOptsIn, Config, Logs, Scores);
    this.GameRecords = { ...GameRecords };
    this.Headers = [...Headers];
    this.nbdarts = nbdarts;
    this.Handicap = new CHandicap('Ho_One', Config);
    this.maxround = parseInt(this.GameOpts.max_round, 10) || 20;

    if (nbplayers !== 4 && String(this.GameOpts.league) === 'True') {
      this.Logs.Log('WARNING', 'League option can only be used with 4 players! Disabling league play!');
      this.GameOpts.league = 'False';
    } else if (String(this.GameOpts.league) === 'True') {
      this.myDisplay.Teaming = true;
    }

    if (String(this.GameOpts.split_bull) === 'False') {
      this.ScoreMap.SB = 50;
    }

    this.finisherDarts = null;
    this.finishers = [];
    this.isDraw = false;
  }

  getMaxDartsForRound(actualround, actualplayer) {
    const isEqualActive = (String(this.GameOpts.equal) === 'True' || this.GameOpts.equal === true) && this.nbplayers > 1;
    if (isEqualActive && this.finisherDarts !== null) {
      const prev = (actualround - 1) * this.nbdarts;
      const allowed = this.finisherDarts - prev;
      return Math.max(0, Math.min(this.nbdarts, allowed));
    }
    return this.nbdarts;
  }

  PreDartsChecks(LSTPlayers, actualround, actualplayer, playerlaunch) {
    let return_code = 0;
    let teammatescore = 0;
    let otherteamscore = 0;
    this.Frozen = false;

    const isEqualActive = (String(this.GameOpts.equal) === 'True' || this.GameOpts.equal === true) && this.nbplayers > 1;
    if (isEqualActive && this.finisherDarts !== null) {
      if (LSTPlayers[actualplayer].score === 0) {
        return 4; // Already finished, skip
      }
      const prev = (actualround - 1) * this.nbdarts;
      if (prev >= this.finisherDarts) {
        return 4; // Already thrown max allowed darts, skip
      }
    }

    if (actualround === 1 && playerlaunch === 1 && actualplayer === 0) {
      let LST = [];
      try {
        LST = this.CheckHandicap(LSTPlayers);
      } catch (e) {
        this.Logs.Log('ERROR', `Handicap failed: ${e.message}`);
      }
      for (const Player of LSTPlayers) {
        if (String(this.GameOpts.league) === 'False') {
          Player.score = parseInt(this.GameOpts.startingat, 10) || 301;
        } else if (String(this.GameOpts.league) === 'True' && LST && LST[Player.ident]) {
          Player.score = parseInt(LST[Player.ident], 10);
        } else {
          Player.score = parseInt(this.GameOpts.startingat, 10) || 301;
        }
        Player.Avg = 0;
      }
    }

    if (playerlaunch === 1) {
      LSTPlayers[actualplayer].pointsinround = 0;
      this.SaveTurn(LSTPlayers);
      LSTPlayers[actualplayer].PrePlayScore = LSTPlayers[actualplayer].score;
      LSTPlayers[actualplayer].LSTColVal = [];
      for (let i = 0; i < 7; i++) {
        LSTPlayers[actualplayer].LSTColVal.push(['', 'int', null]);
      }
    }

    const startingAt = parseInt(this.GameOpts.startingat, 10) || 301;
    const hasStarted = LSTPlayers[actualplayer].TotalPoints > 0 && LSTPlayers[actualplayer].score !== startingAt;
    if (!hasStarted) {
      LSTPlayers[actualplayer].LSTColVal[5] = ['-', 'str', null];
      LSTPlayers[actualplayer].LSTColVal[6] = ['-', 'str', null];
    } else {
      LSTPlayers[actualplayer].LSTColVal[5] = [LSTPlayers[actualplayer].ShowPPD(), 'float', null];
      LSTPlayers[actualplayer].LSTColVal[6] = [LSTPlayers[actualplayer].ShowPPR(actualround), 'float', null];
    }

    for (let i = playerlaunch - 1; i < this.nbdarts; i++) {
      LSTPlayers[actualplayer].LSTColVal[i] = ['', 'int', null];
    }

    const maxDartsThisTurn = this.getMaxDartsForRound(actualround, actualplayer);
    const PossibleLaunch = this.SearchPossibleLaunch(LSTPlayers[actualplayer].score, playerlaunch, maxDartsThisTurn);
    if (PossibleLaunch.length >= 1) LSTPlayers[actualplayer].LSTColVal[playerlaunch - 1] = [PossibleLaunch[0], 'int', 'green'];
    if (PossibleLaunch.length >= 2) LSTPlayers[actualplayer].LSTColVal[playerlaunch] = [PossibleLaunch[1], 'int', 'green'];
    if (PossibleLaunch.length >= 3) LSTPlayers[actualplayer].LSTColVal[playerlaunch + 1] = [PossibleLaunch[2], 'int', 'green'];

    if (String(this.GameOpts.league) === 'True') {
      const teammate = this.Mate(actualplayer, LSTPlayers.length);
      teammatescore = LSTPlayers[teammate].score;
      if (actualplayer === 0 || actualplayer === 2) {
        otherteamscore += LSTPlayers[1].score + LSTPlayers[3].score;
      } else {
        otherteamscore += LSTPlayers[0].score + LSTPlayers[2].score;
      }
      if (teammatescore >= otherteamscore) {
        this.Frozen = true;
        LSTPlayers[actualplayer].LSTColVal[3] = ['FRZ', 'str', 'red'];
      } else {
        this.Frozen = false;
        LSTPlayers[actualplayer].LSTColVal[3] = ['', 'str', 'red'];
      }
    }

    return return_code;
  }

  PostDartsChecks(hit, LSTPlayers, actualround, actualplayer, playerlaunch) {
    let return_code = 0;
    const hitVal = this.ScoreMap[hit] || 0;
    const subscore = LSTPlayers[actualplayer].score - hitVal;
    const startingAt = parseInt(this.GameOpts.startingat, 10) || 301;
    const doubleIn = String(this.GameOpts.double_in) === 'True';
    const masterIn = String(this.GameOpts.master_in) === 'True';
    const doubleOut = String(this.GameOpts.double_out) === 'True';
    const masterOut = String(this.GameOpts.master_out) === 'True';

    // Starting Ho_One
    if (LSTPlayers[actualplayer].score === startingAt) {
      if (
        (doubleIn && hit.startsWith('D')) ||
        (masterIn && (hit.startsWith('D') || hit.startsWith('T') || hit.slice(1) === 'B')) ||
        (!doubleIn && !masterIn)
      ) {
        this.myDisplay.Sound4Touch(hit);
        LSTPlayers[actualplayer].score = subscore;
        LSTPlayers[actualplayer].pointsinround += hitVal;
        LSTPlayers[actualplayer].TotalPoints += hitVal;
      }
    } else if (subscore === 0) {
      // Ending Ho_One
      if (this.Frozen) {
        this.myDisplay.InfoMessage(['Bloqué (Freeze) et arrivé à zéro ! Vous perdez !'], 3000, 'red', 'middle', 'huge');
        this.myDisplay.PlaySound('fail');
        return_code = 3;
        this.winner = (actualplayer === 0 || actualplayer === 2) ? actualplayer + 1 : actualplayer - 1;
      } else if (
        (doubleOut && hit.startsWith('D')) ||
        (masterOut && (hit.startsWith('D') || hit.startsWith('T') || hit.slice(1) === 'B')) ||
        (!doubleOut && !masterOut)
      ) {
        this.myDisplay.Sound4Touch(hit);
        LSTPlayers[actualplayer].score = 0;
        LSTPlayers[actualplayer].TotalPoints += hitVal;

        const isEqualActive = (String(this.GameOpts.equal) === 'True' || this.GameOpts.equal === true) && this.nbplayers > 1;
        const currentDarts = (actualround - 1) * this.nbdarts + playerlaunch;

        if (!isEqualActive) {
          return_code = 3;
          this.winner = actualplayer;
        } else {
          // Mode Equal : enregistrement de la performance
          if (this.finisherDarts === null) {
            this.finisherDarts = currentDarts;
            this.finishers = [{ player: actualplayer, darts: currentDarts }];
          } else if (currentDarts < this.finisherDarts) {
            this.finisherDarts = currentDarts;
            this.finishers = [{ player: actualplayer, darts: currentDarts }];
          } else if (currentDarts === this.finisherDarts) {
            this.finishers.push({ player: actualplayer, darts: currentDarts });
          }

          // Vérifier s'il reste des joueurs n'ayant pas encore lancé leur quota dans ce tour
          if (actualplayer < this.nbplayers - 1) {
            return_code = 1; // Fin du tour du joueur actuel, passage au suivant
          } else {
            return_code = 3; // Tous les joueurs éligibles ont terminé
            if (this.finishers.length > 1) {
              this.winner = -1;
              this.isDraw = true;
            } else {
              this.winner = this.finishers[0].player;
              this.isDraw = false;
            }
          }
        }
      } else {
        return_code = 1;
        LSTPlayers[actualplayer].score = LSTPlayers[actualplayer].PrePlayScore;
        LSTPlayers[actualplayer].TotalPoints -= LSTPlayers[actualplayer].pointsinround;
        this.myDisplay.PlaySound('fail');
        this.myDisplay.InfoMessage(['BUST !'], 1600, '#FF3366', 'middle', 'huge');
      }
    } else if (subscore === 1 && (doubleOut || masterOut)) {
      return_code = 1;
      LSTPlayers[actualplayer].score = LSTPlayers[actualplayer].PrePlayScore;
      LSTPlayers[actualplayer].TotalPoints -= LSTPlayers[actualplayer].pointsinround;
      this.myDisplay.PlaySound('fail');
      this.myDisplay.InfoMessage(['BUST !'], 1600, '#FF3366', 'middle', 'huge');
    } else if (subscore > 0) {
      this.myDisplay.Sound4Touch(hit);
      LSTPlayers[actualplayer].score = subscore;
      LSTPlayers[actualplayer].pointsinround += hitVal;
      LSTPlayers[actualplayer].TotalPoints += hitVal;
    } else {
      return_code = 1;
      LSTPlayers[actualplayer].score = LSTPlayers[actualplayer].PrePlayScore;
      LSTPlayers[actualplayer].TotalPoints -= LSTPlayers[actualplayer].pointsinround;
      this.myDisplay.PlaySound('fail');
      this.myDisplay.InfoMessage(['BUST !'], 1600, '#FF3366', 'middle', 'huge');
    }

    const isEqualActive = (String(this.GameOpts.equal) === 'True' || this.GameOpts.equal === true) && this.nbplayers > 1;
    const maxDartsThisTurn = this.getMaxDartsForRound(actualround, actualplayer);

    if (isEqualActive && this.finisherDarts !== null && return_code !== 3) {
      if (playerlaunch >= maxDartsThisTurn || return_code === 1) {
        return_code = 1;
        if (actualplayer === this.nbplayers - 1) {
          return_code = 3;
          if (this.finishers.length > 1) {
            this.winner = -1;
            this.isDraw = true;
          } else if (this.finishers.length === 1) {
            this.winner = this.finishers[0].player;
            this.isDraw = false;
          }
        }
      }
    }

    if (actualround >= parseInt(this.maxround, 10) && actualplayer === this.nbplayers - 1 && playerlaunch === parseInt(this.nbdarts, 10) && return_code !== 3) {
      return_code = 2;
    }

    LSTPlayers[actualplayer].LSTColVal[playerlaunch - 1] = [hitVal, 'int', null];
    LSTPlayers[actualplayer].LSTColVal[4] = [LSTPlayers[actualplayer].pointsinround, 'int', null];
    LSTPlayers[actualplayer].dartsthrown += 1;
    LSTPlayers[actualplayer].IncrementHits(hit);
    const hasStarted = LSTPlayers[actualplayer].TotalPoints > 0 && LSTPlayers[actualplayer].score !== startingAt;
    if (!hasStarted) {
      LSTPlayers[actualplayer].LSTColVal[5] = ['-', 'str', null];
      LSTPlayers[actualplayer].LSTColVal[6] = ['-', 'str', null];
    } else {
      LSTPlayers[actualplayer].LSTColVal[5] = [LSTPlayers[actualplayer].ShowPPD(), 'float', null];
      LSTPlayers[actualplayer].LSTColVal[6] = [LSTPlayers[actualplayer].ShowPPR(actualround), 'float', null];
    }
    this.RefreshStats(LSTPlayers, actualround);

    return return_code;
  }

  SearchPossibleLaunch(Score, playerlaunch, maxDarts = this.nbdarts) {
    const doubleOut = String(this.GameOpts.double_out) === 'True';
    const masterOut = String(this.GameOpts.master_out) === 'True';
    const entries = Object.entries(this.ScoreMap);

    const isValidClosingHit = (Hit) => {
      if (!doubleOut && !masterOut) return true;
      if (doubleOut && Hit.startsWith('D')) return true;
      if (masterOut && (Hit.startsWith('D') || Hit.startsWith('T') || Hit.slice(1) === 'B')) return true;
      return false;
    };

    // 1 dart possibility
    for (const [Hit, DicKey] of entries) {
      if (Score === DicKey && isValidClosingHit(Hit)) {
        return [Hit];
      }
    }

    // 2 darts possibilities
    if ((playerlaunch === 2 || playerlaunch === 1) && maxDarts >= 2) {
      for (const [Hit, DicKey] of entries) {
        if (Score > DicKey && isValidClosingHit(Hit)) {
          const firstrest = Score - DicKey;
          for (const [Hit2, DicKey2] of entries) {
            if (firstrest === DicKey2) {
              return [Hit2, Hit];
            }
          }
        }
      }
    }

    // 3 darts possibilities
    if (playerlaunch === 1 && maxDarts >= 3) {
      for (const [Hit, DicKey] of entries) {
        if (Score > DicKey && isValidClosingHit(Hit)) {
          const firstrest = Score - DicKey;
          for (const [Hit3, DicKey3] of entries) {
            if (firstrest > DicKey3) {
              const secondrest = firstrest - DicKey3;
              for (const [Hit4, DicKey4] of entries) {
                if (secondrest === DicKey4) {
                  return [Hit3, Hit4, Hit];
                }
              }
            }
          }
        }
      }
    }

    return [];
  }

  RefreshStats(Players, actualround = null) {
    const startingAt = parseInt(this.GameOpts.startingat, 10) || 301;
    for (const P of Players) {
      const hasStarted = P.TotalPoints > 0 && P.score !== startingAt;
      P.Stats['Points Per Round'] = hasStarted ? P.ShowPPR(actualround) : 0.0;
      P.Stats['Points Per Dart'] = hasStarted ? P.ShowPPD() : 0.0;
      const isFinisher = this.finishers.some(f => f.player === P.ident) || (this.winner === P.ident && P.score === 0);
      if (isFinisher && P.score === 0) {
        P.Stats['Best Finish'] = P.PrePlayScore || 0;
        P.Stats['Least Darts'] = P.dartsthrown;
      }
    }
  }

  GameStats(Players, actualround, Scores = false) {
    this.RefreshStats(Players, null);
    return super.GameStats(Players, null, Scores);
  }

  EarlyPlayerButton(LSTPlayers, actualround, actualplayer) {
    const isEqualActive = (String(this.GameOpts.equal) === 'True' || this.GameOpts.equal === true) && this.nbplayers > 1;
    if (isEqualActive && this.finisherDarts !== null) {
      if (actualplayer === this.nbplayers - 1) {
        if (this.finishers.length > 1) {
          this.winner = -1;
          this.isDraw = true;
          return 3;
        } else if (this.finishers.length === 1) {
          this.winner = this.finishers[0].player;
          this.isDraw = false;
          return 3;
        }
      }
    }
    return super.EarlyPlayerButton(LSTPlayers, actualround, actualplayer);
  }

  DefineNextGameOrder(LSTPlayers) {
    return [...LSTPlayers]
      .sort((a, b) => b.score - a.score)
      .map(p => p.PlayerName);
  }

  GetMissPenalty(Players, actualplayer, playerlaunch) {
    if (String(this.GameOpts.noout) === 'True') {
      return 25;
    }
    return 0;
  }

  MissButtonPressed(Players, actualplayer, actualround, playerlaunch) {
    const pen = this.GetMissPenalty(Players, actualplayer, playerlaunch);
    if (pen > 0) {
      Players[actualplayer].ModifyScore(pen);
    }
    return super.MissButtonPressed(Players, actualplayer, actualround, playerlaunch);
  }

  NotFisnished(Players, actualplayer, actualround, playerlaunch) {
    if (String(this.GameOpts.noout) === 'True' && playerlaunch <= this.nbdarts) {
      Players[actualplayer].ModifyScore(25 * (this.nbdarts + 1 - playerlaunch));
    }
    return null;
  }

  Mate(actualplayer, nbplayers) {
    const half = Math.trunc(nbplayers / 2);
    return actualplayer < half ? actualplayer + half : actualplayer - half;
  }

  CheckHandicap(LSTPlayers) {
    const LSTPPD = [];
    for (const player of LSTPlayers) {
      const ppd = this.Scores ? this.Scores.getPlayerHandicapStat(player.PlayerName, 'PPD') : 0;
      LSTPPD.push(Math.trunc(ppd));
    }
    return this.Handicap.hoonehandicap(LSTPPD, this.GameOpts.startingat, LSTPlayers);
  }
}

