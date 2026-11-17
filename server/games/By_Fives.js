import { CPlayer } from '../engine/CPlayer.js';
import { CGame } from '../engine/CGame.js';

export const Headers = ['Tour', 'D1', 'D2', 'D3'];
export const GameOpts = {
  winscore: '5'
};
export const nbdarts = 3;
export const GameRecords = {
  'Least Rounds': 'ASC'
};

export class CPlayerExtended extends CPlayer {
  constructor(x, NbPlayers, Config) {
    super(x, NbPlayers, Config);
    this.PrePlayScore = null;
    for (const GR of Object.keys(GameRecords)) {
      this.Stats[GR] = '0';
    }
  }
}

export class Game extends CGame {
  constructor(myDisplay, GameChoice, nbplayers, GameOptsIn, Config, Logs, Scores) {
    super(myDisplay, GameChoice, nbplayers, GameOptsIn, Config, Logs, Scores);
    this.Headers = [...Headers];
    this.maxround = 99;
    this.nbdarts = nbdarts;
    this.GameRecords = { ...GameRecords };
  }

  PreDartsChecks(Players, actualround, actualplayer, playerlaunch) {
    if (actualround === 1 && playerlaunch === 1 && actualplayer === 0) {
      for (const Player of Players) {
        Player.score = 0;
      }
    }

    if (playerlaunch === 1) {
      Players[actualplayer].pointsinround = 0;
      this.SaveTurn(Players);
      Players[actualplayer].PrePlayScore = Players[actualplayer].score;
      Players[actualplayer].LSTColVal = [];
      for (let i = 0; i < 4; i++) {
        Players[actualplayer].LSTColVal.push(['', 'int', null]);
      }
    }
    return 0;
  }

  PostDartsChecks(hit, Players, actualround, actualplayer, playerlaunch) {
    let return_code = 0;
    const hitPts = this.ScoreMap[hit] || 0;
    this.myDisplay.Sound4Touch(hit);
    Players[actualplayer].pointsinround += hitPts;
    Players[actualplayer].TotalPoints += hitPts;

    if (playerlaunch === 3) {
      if (this.Modby5(Players[actualplayer].pointsinround)) {
        Players[actualplayer].score += 1;
      }
    }

    Players[actualplayer].LSTColVal[0] = [Players[actualplayer].pointsinround, 'int', null];
    Players[actualplayer].LSTColVal[playerlaunch] = [hitPts, 'int', null];
    Players[actualplayer].IncrementHits(hit);
    Players[actualplayer].dartsthrown += 1;
    this.RefreshStats(Players, actualround);

    if (actualround >= parseInt(this.maxround, 10) && actualplayer === this.nbplayers - 1 && playerlaunch === parseInt(this.nbdarts, 10)) {
      return_code = 2;
    }

    const winner = this.CheckWinner(Players);
    if (winner !== -1) {
      this.winner = winner;
      return_code = 3;
    }

    return return_code;
  }

  Modby5(score) {
    return score % 5 === 0;
  }

  CheckWinner(Players) {
    const target = parseInt(this.GameOpts.winscore, 10) || 5;
    for (const Player of Players) {
      if (Player.score === target) {
        return Player.ident;
      }
    }
    return -1;
  }

  RefreshStats(Players, actualround) {
    for (const P of Players) {
      P.Stats.Score = P.TotalPoints > 0 ? P.score : 0;
      if (this.winner === P.ident) {
        P.Stats['Least Rounds'] = actualround || 1;
      }
    }
  }

  DefineNextGameOrder(Players) {
    return [...Players]
      .sort((a, b) => b.score - a.score)
      .map(p => p.PlayerName);
  }
}

