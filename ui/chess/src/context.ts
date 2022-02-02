import { Context, createContext } from '@holochain-open-dev/context';
import { ChessStore } from './chess-store';

export const chessStoreContext: Context<ChessStore> =
  createContext('chess/store');
