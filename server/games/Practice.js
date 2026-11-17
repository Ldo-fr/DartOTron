import { CPlayer } from '../engine/CPlayer.js';
import { CGame } from '../engine/CGame.js';

export const Headers = ['Cible', 'D1', 'D2', 'D3'];
export const GameOpts = {
  max_round: '10'
};
export const GameRecords = {};
export const nbdarts = 3;

export class CPlayerExtended extends CPlayer {
  constructor(x, NbPlayers, Config) {
    super(x, NbPlayers, Config);
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
    this.maxround = parseInt(this.GameOpts.max_round, 10) || 10;
  }

  PreDartsChecks(LSTPlayers, actualround, actualplayer, playerlaunch) {
    if (playerlaunch === 1) {
      this.SaveTurn(LSTPlayers);
      const num = Math.floor(Math.random() * 22) + 1;
      const isMaster = String(this.GameOpts.master) === 'True';
      let rand = '';
      if (num === 21 && isMaster) {
        rand = 'SB';
      } else if (num === 22 && isMaster) {
        rand = 'DB';
      } else if ((num === 21 || num === 22) && !isMaster) {
        rand = 'B';
      } else if (!isMaster) {
        rand = String(num);
      } else {
        const randMultiple = Math.floor(Math.random() * 3) + 1;
        if (randMultiple === 1) rand = `S${num}`;
        else if (randMultiple === 2) rand = `D${num}`;
        else rand = `T${num}`;
      }

      for (let col = 0; col < LSTPlayers[actualplayer].LSTColVal.length; col++) {
        LSTPlayers[actualplayer].LSTColVal[col] = ['', 'txt', null];
      }
      LSTPlayers[actualplayer].LSTColVal[0] = [rand, 'txt', 'yellow'];
    }
    return 0;
  }

  PostDartsChecks(hit, LSTPlayers, actualround, actualplayer, playerlaunch) {
    let return_code = 0;
    const isMaster = String(this.GameOpts.master) === 'True';
    let hitcoeff = 1;

    if (isMaster) {
      if (hit.startsWith('S')) hitcoeff = 1;
      else if (hit.startsWith('D')) hitcoeff = 3;
      else if (hit.startsWith('T')) hitcoeff = 6;
      if (hit === 'SB') hitcoeff = 5;
      else if (hit === 'DB') hitcoeff = 10;
    } else {
      if (hit.startsWith('S')) hitcoeff = 1;
      else if (hit.startsWith('D')) hitcoeff = 2;
      else if (hit.startsWith('T')) hitcoeff = 3;
      if (hit === 'SB') hitcoeff = 1;
      else if (hit === 'DB') hitcoeff = 2;
    }

    const target = String(LSTPlayers[actualplayer].GetColVal(0));
    if ((isMaster && hit === target) || (!isMaster && hit.slice(1) === target)) {
      LSTPlayers[actualplayer].IncrementHits(hit);
      this.myDisplay.Sound4Touch(hit);
      LSTPlayers[actualplayer].score += hitcoeff;
      LSTPlayers[actualplayer].TotalPoints += hitcoeff;
      LSTPlayers[actualplayer].LSTColVal[playerlaunch] = [`+${hitcoeff}`, 'txt', 'green'];
    }

    if (
      playerlaunch === this.nbdarts &&
      actualround === parseInt(this.maxround, 10) &&
      actualplayer === LSTPlayers.length - 1
    ) {
      let bestscoreid = -1;
      let bestscore = -1;
      for (const Player of LSTPlayers) {
        if (Player.score > bestscore) {
          bestscore = Player.score;
          bestscoreid = Player.ident;
        }
      }
      this.winner = bestscoreid;
      return_code = 3;
    }

    LSTPlayers[actualplayer].dartsthrown += 1;
    this.RefreshStats(LSTPlayers, actualround);
    return return_code;
  }

  RefreshStats(Players, actualround) {
    for (const P of Players) {
      const hasStarted = P.hits > 0 || P.TotalPoints > 0 || P.score > 0;
      P.Stats['Hits per round'] = hasStarted ? P.HitsPerRound(actualround) : 0.0;
      P.Stats.MPR = hasStarted ? P.ShowMPR() : 0.0;
    }
  }
}

