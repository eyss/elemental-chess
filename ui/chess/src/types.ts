import {
  AgentPubKeyB64,
  EntryHashB64,
  HeaderHashB64,
} from '@holochain-open-dev/core-types';

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

export interface ChessGameState {
  white_address: AgentPubKeyB64;
  black_address: AgentPubKeyB64;
  board_state: string;
}

export interface PublishResultInput {
  game_hash: EntryHashB64;
  last_game_move_hash: HeaderHashB64;
  my_score: number;
}
