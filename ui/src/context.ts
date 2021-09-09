import { createContext, Context } from '@lit-labs/context';
import { ChessService } from './chess.service';

export const chessServiceContext: Context<ChessService> =
  createContext('chess/service');
