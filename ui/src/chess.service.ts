import { AppWebsocket, CellId } from '@holochain/conductor-api';
import * as msgpack from '@msgpack/msgpack';
import { ChessMove, GameEntry, MoveInfo } from './types';

export class ChessService {
  constructor(
    public appWebsocket: AppWebsocket,
    public cellId: CellId,
    public zomeName = 'invitations'
  ) {}

  createGame(opponentPubKey: string): Promise<string> {
    return this.callZome('create_game', opponentPubKey);
  }

  async getGame(gameHash: string): Promise<GameEntry> {
    return await this.callZome('get_game', gameHash);
  }

  async getGameMoves(gameHash: string): Promise<Array<MoveInfo<ChessMove>>> {
    const moves: Array<MoveInfo<any>> = await this.callZome(
      'get_game_moves',
      gameHash
    );

    return moves.map(move => ({
      ...move,
      move_entry: {
        ...move.move_entry,
        game_move: msgpack.decode(move.move_entry.game_move) as ChessMove,
      },
    }));
  }

  async makeMove(
    gameHash: string,
    previousMoveHash: string | undefined,
    move: ChessMove
  ): Promise<string> {
    return this.callZome('make_move', {
      game_hash: gameHash,
      prev_movement: previousMoveHash,
      game_move: move,
    });
  }

  private callZome(fn_name: string, payload: any) {
    return this.appWebsocket.callZome({
      cap: null as any,
      cell_id: this.cellId,
      zome_name: this.zomeName,
      fn_name: fn_name,
      payload: payload,
      provenance: this.cellId[1],
    });
  }
}
