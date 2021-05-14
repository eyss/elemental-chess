export interface GameEntry {
  players: Array<string>;
  created_at: number;
}

export interface GameMoveEntry<M> {
  game_hash: string;
  author_pub_key: string;
  game_move: M;
  previous_move_hash: string | undefined;
}

export interface GameInfo<M> {
  game_entry: GameEntry;
  moves: Array<MoveInfo<M>>;
}

export interface MoveInfo<M> {
  move_hash: string;
  move_entry: GameMoveEntry<M>;
}

export type ChessMove =
  | {
      type: 'Resign';
    }
  | { type: 'PlacePiece'; from: string; to: string };

export interface ChessGame {
  white_address: string;
  black_address: string;
  game: ChessGameState;
}

export interface ChessGameState {
  moves: Array<string>;
}
