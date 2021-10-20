import { Context, createContext } from '@lit-labs/context';
import { ChessStore } from './chess-store';

export const chessStoreContext: Context<ChessStore> =
  createContext('chess/store');
