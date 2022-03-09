import { EntryHashB64 } from '@holochain-open-dev/core-types';


export type ChessMove =
  | {
      type: 'Resign';
    }
  | {
      type: 'PlacePiece';
      from: string;
      to: string;
      promotion: string | undefined;
    };

export interface ChessGame {
  white_address: string;
  black_address: string;
  board_state: string;
}

export interface ChessGameState {
  moves: Array<string>;
}

export interface ChessGameResult {
  game_hash: EntryHashB64;
  timestamp: number;
  black_player: string;
  white_player: string;
  winner: { Black: undefined } | { White: undefined } | { Draw: undefined };
  num_of_moves: number;
}
