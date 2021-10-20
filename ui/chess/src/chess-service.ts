import { CellClient } from '@holochain-open-dev/cell-client';
import { ChessMove } from './types';
import {
  AgentPubKeyB64,
  EntryHashB64,
  HeaderHashB64,
} from '@holochain-open-dev/core-types';
import { CreateGameResultOutcome } from '@eyss/elo';

export class ChessService {
  constructor(public cellClient: CellClient, public zomeName = 'chess') {}

  createGame(opponent: AgentPubKeyB64): Promise<EntryHashB64> {
    return this.callZome('create_game', opponent);
  }

  publishResult(
    gameHash: EntryHashB64,
    lastGameMoveHash: HeaderHashB64,
    myScore: 1.0 | 0.5 | 0.0
  ): Promise<CreateGameResultOutcome> {
    return this.callZome('publish_result', {
      game_hash: gameHash,
      last_game_move_hash: lastGameMoveHash,
      my_score: myScore,
    });
  }

  finishGameAndLinkResult(
    gameHash: EntryHashB64,
    gameResultHash: EntryHashB64
  ) {
    return this.callZome('finish_game_and_link', {
      game_hash: gameHash,
      game_result_hash: gameResultHash,
    });
  }

  publishGameResultAndFlag(
    gameHash: EntryHashB64,
    lastGameMoveHash: HeaderHashB64,
    myScore: 1.0 | 0.5 | 0.0
  ): Promise<CreateGameResultOutcome> {
    return this.callZome('publish_game_result_and_flag', {
      game_hash: gameHash,
      last_game_move_hash: lastGameMoveHash,
      my_score: myScore,
    });
  }

  private callZome(fn_name: string, payload: any) {
    return this.cellClient.callZome(this.zomeName, fn_name, payload);
  }
}
