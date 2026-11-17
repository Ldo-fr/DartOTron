import { CPlayer } from '../engine/CPlayer.js';
import { CGame } from '../engine/CGame.js';

export const Headers = ['Min', 'Total', 'Kinito'];
export const GameOpts = {
  max_round: '10'
};
export const nbdarts = 3;
export const GameRecords = {};

export class CPlayerExtended extends CPlayer {
  constructor(x, NbPlayers, Config) {
    super(x, NbPlayers, Config);
    this.minscore = null;
    this.kinito = false;
    this.TotalPoints = 0;
    this.KinitoScore = '';
    for (const GR of Object.keys(GameRecords)) {
      this.Stats[GR] = '0';
    }
  }
}

export class Game extends CGame {
  constructor(myDisplay, GameChoice, nbplayers, GameOptsIn, Config, Logs, Scores) {
    super(myDisplay, GameChoice, nbplayers, GameOptsIn, Config, Logs, Scores);
    this.nbplayers = nbplayers;
    this.GameRecords = { ...GameRecords };
    this.nbdarts = nbdarts;
    this.Headers = [...Headers];
    this.maxround = parseInt(this.GameOpts.max_round, 10) || 10;
  }

  PreDartsChecks(Players, actualround, actualplayer, playerlaunch) {
    let return_code = 0;
    if (playerlaunch === 1 && actualplayer === 0 && actualround === 1) {
      for (const Player of Players) {
        Player.LSTColVal[0] = [0, 'int', 'green'];
      }
      Players[actualplayer].minscore = Math.floor(Math.random() * 20) + 1;
    }
    if (Players[actualplayer].minscore === null) {
      Players[actualplayer].minscore = 0;
    }

    Players[actualplayer].LSTColVal[0] = [Players[actualplayer].minscore, 'int', null];
    if (playerlaunch === 1) {
      this.SaveTurn(Players);
      Players[actualplayer].LSTColVal[1] = [0, 'int', null];
      for (const Player of Players) {
        Player.kinito = false;
        Player.KinitoScore = '';
        Player.LSTColVal[2] = ['', 'int', 'green'];
      }
    }
    for (const Player of Players) {
      Player.LSTColVal[2] = [Player.KinitoScore, 'int', 'red'];
    }

    const WinnerValue = this.CheckWinner(Players, actualplayer);
    if (WinnerValue !== -1) {
      return_code = WinnerValue;
    }
    return return_code;
  }

  PostDartsChecks(hit, Players, actualround, actualplayer, playerlaunch) {
    let return_code = 0;
    const nextplayer = actualplayer === this.nbplayers - 1 ? 0 : actualplayer + 1;
    const hitPts = this.ScoreMap[hit] || 0;
    const kinitoTarget = parseInt(this.GameOpts.kinito, 10) || 21;
    const winscore = parseInt(this.GameOpts.winscore, 10) || 210;
    const isMaster = String(this.GameOpts.master) === 'True';

    if (hitPts >= Players[actualplayer].minscore && (playerlaunch === this.nbdarts || hit !== 'T7') && !Players[actualplayer].kinito) {
      Players[actualplayer].minscore = hitPts;
      Players[actualplayer].IncrementCol(hitPts, 1);
      Players[actualplayer].score += hitPts;
      Players[actualplayer].TotalPoints += hitPts;
      this.myDisplay.Sound4Touch(hit);
    }

    if (hitPts < Players[actualplayer].minscore && (hit !== 'T7' || playerlaunch === this.nbdarts) && !Players[actualplayer].kinito) {
      const lost = Number(Players[actualplayer].GetColVal(1)) || 0;
      Players[actualplayer].score -= lost;
      Players[actualplayer].TotalPoints -= lost;
      return_code = 1;
      this.myDisplay.PlaySound('fail');
    }

    // Kinito Open
    if (hitPts === kinitoTarget && playerlaunch < this.nbdarts) {
      Players[actualplayer].score += hitPts;
      Players[actualplayer].TotalPoints += hitPts;
      this.myDisplay.Sound4Touch(hit);
      this.myDisplay.InfoMessage(['Kinito !'], 1000, null, 'middle', 'big');
      Players[actualplayer].kinito = true;
      Players[actualplayer].KinitoScore = "K'to";
      this.AssignKinitoScore(Players);
    } else if (Players[actualplayer].kinito) {
      for (const Player of Players) {
        if (hitPts === Number(Player.KinitoScore) && Player.ident !== actualplayer) {
          Players[actualplayer].score += hitPts;
          Players[actualplayer].TotalPoints += hitPts;
          Player.score = Math.trunc(Player.score / 2);
          this.myDisplay.Sound4Touch(hit);
        }
      }
    }

    if (Players.length > 1) {
      Players[nextplayer].minscore = Math.trunc(hitPts / 2);
    } else {
      Players[actualplayer].minscore = hitPts;
    }

    if (Players[actualplayer].score > winscore && isMaster) {
      Players[actualplayer].score = 2 * winscore - Players[actualplayer].score;
      Players[actualplayer].TotalPoints += hitPts;
      this.myDisplay.PlaySound('fail');
      this.myDisplay.InfoMessage(['Trop haut !'], 1000, null, 'middle', 'big');
      return_code = 1;
    }

    Players[actualplayer].LSTColVal[0] = [Players[actualplayer].minscore, 'int', null];
    for (const Player of Players) {
      Player.LSTColVal[2] = [Player.KinitoScore, 'int', 'red'];
    }

    Players[actualplayer].IncrementHits(hit);
    Players[actualplayer].dartsthrown += 1;
    this.RefreshStats(Players, actualround);

    if (
      actualround >= parseInt(this.maxround, 10) &&
      actualplayer === this.nbplayers - 1 &&
      (playerlaunch === this.nbdarts || return_code === 1)
    ) {
      return_code = 2;
    }

    const WinnerValue = this.CheckWinner(Players, actualplayer);
    if (WinnerValue !== -1) {
      return_code = WinnerValue;
    }
    return return_code;
  }

  CheckWinner(Players, actualplayer) {
    const winscore = parseInt(this.GameOpts.winscore, 10) || 210;
    const isMaster = String(this.GameOpts.master) === 'True';
    if (Players[actualplayer].score >= winscore && !isMaster) {
      this.winner = Players[actualplayer].ident;
      return 3;
    }
    if (Players[actualplayer].score === winscore && isMaster) {
      this.winner = Players[actualplayer].ident;
      return 3;
    }
    return -1;
  }

  AssignKinitoScore(Players) {
    const kinitoMax = parseInt(this.GameOpts.kinito, 10) || 21;
    const possibleValues = Object.values(this.ScoreMap).filter(v => v < kinitoMax);
    for (const Player of Players) {
      if (!Player.kinito) {
        Player.KinitoScore = possibleValues[Math.floor(Math.random() * possibleValues.length)] || 10;
      }
    }
  }

  EarlyPlayerButton(Players, actualplayer, actualround) {
    if (String(this.GameOpts.master) === 'True') {
      Players[actualplayer].score -= Number(Players[actualplayer].LSTColVal[1]?.[0]) || 0;
    }
    if (actualround === parseInt(this.maxround, 10) && actualplayer === this.nbplayers - 1) {
      return 2;
    }
    return 1;
  }

  RefreshStats(Players, actualround) {
    for (const P of Players) {
      const hasStarted = P.TotalPoints > 0 || P.score > 0;
      P.Stats['Points Per Round'] = hasStarted ? P.AVG(actualround) : 0.0;
    }
  }
}

