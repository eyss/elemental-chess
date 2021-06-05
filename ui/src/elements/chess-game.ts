import { html, css } from 'lit';
import { property } from 'lit/decorators.js';
import { requestContext } from '@holochain-open-dev/context';
import { ChessBoardElement } from 'chessboard-element';
// @ts-ignore
import { Chess } from 'chess.js';
import ConductorApi from '@holochain/conductor-api';
import * as msgpack from '@msgpack/msgpack';
import { CircularProgress } from 'scoped-material-components/mwc-circular-progress';
import { List } from 'scoped-material-components/mwc-list';

import { sharedStyles } from './sharedStyles';
import { ChessService } from '../chess.service';
import {
  ChessGameResult,
  ChessMove,
  GameEntry,
  GameMoveEntry,
  MoveInfo,
} from '../types';
import {
  ProfilesStore,
  PROFILES_STORE_CONTEXT,
} from '@holochain-open-dev/profiles';
import { ListItem } from 'scoped-material-components/mwc-list-item';
import { Card } from 'scoped-material-components/mwc-card';
import { Button } from 'scoped-material-components/mwc-button';
import { CHESS_SERVICE_CONTEXT } from '../constants';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { MobxLitElement } from '@adobe/lit-mobx';

const whiteSquareGrey = '#a9a9a9';
const blackSquareGrey = '#696969';

const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(() => resolve(null), ms));

export class ChessGame extends ScopedRegistryHost(MobxLitElement) {
  @property()
  gameHash!: string;

  @property()
  _gameInfo!: GameEntry;
  _moves: Array<MoveInfo<ChessMove>> = [];

  _chessGame!: any;
  _chessStyles!: string;

  @requestContext(CHESS_SERVICE_CONTEXT)
  _chessService!: ChessService;

  @requestContext(PROFILES_STORE_CONTEXT)
  _profilesStore!: ProfilesStore;

  listenForOpponentMove() {
    const hcConnection = this._chessService.appWebsocket;

    ConductorApi.AppWebsocket.connect(
      hcConnection.client.socket.url,
      15000,
      signal => {
        const payload = signal.data.payload;
        if (payload.Move) {
          const game_hash = payload.Move.move_entry.game_hash;
          if (game_hash !== this.gameHash) return;

          const move = payload.Move;
          move.move_entry.game_move = msgpack.decode(move.move_entry.game_move);

          this._moves.push(move);

          if (move.move_entry.game_move.to) {
            const { from, to } = move.move_entry.game_move;
            const moveString = `${from}-${to}`;

            this._chessGame.move({ from, to });
            (this.shadowRoot?.getElementById('board') as any).move(moveString);
          }

          this.announceIfGameEnded();

          this.requestUpdate();
        }
      }
    );
  }

  async getGameInfo(retriesLeft = 4): Promise<GameEntry> {
    try {
      const gameInfo = await this._chessService.getGame(this.gameHash);
      return gameInfo;
    } catch (e) {
      if (retriesLeft === 0) throw new Error(`Couldn't get game`);

      await sleep(200);
      return this.getGameInfo(retriesLeft - 1);
    }
  }

  async firstUpdated() {
    const gameInfo = await this.getGameInfo();

    this._moves = await this._chessService.getGameMoves(this.gameHash);

    const opponent = gameInfo.players.find(
      player => player !== this.myAddress
    ) as string;

    await this._profilesStore.fetchAgentProfile(opponent);

    this._chessGame = new Chess();
    for (const move of this._moves) {
      if (move.move_entry.game_move.type === 'PlacePiece') {
        const { from, to } = move.move_entry.game_move;
        this._chessGame.move({ from, to });
      }
    }

    this._chessStyles = '';

    this.listenForOpponentMove();

    this._gameInfo = gameInfo;

    this.announceIfGameEnded();
  }

  get myAddress() {
    return this._profilesStore.myAgentPubKey;
  }

  amIWhite() {
    return this._gameInfo.players[0] === this.myAddress;
  }

  isMyTurn() {
    const turnColor = this._chessGame.turn();
    const myColor = this.amIWhite() ? 'w' : 'b';

    return turnColor === myColor;
  }

  getOpponent(): string {
    return this._gameInfo.players.find(
      player => player !== this.myAddress
    ) as string;
  }

  getOpponentNickname(): string {
    return this._profilesStore.profileOf(this.getOpponent()).nickname;
  }

  removeGreySquares() {
    (this.shadowRoot?.getElementById('chessStyle') as any).textContent = '';
  }

  greySquare(square: string) {
    const highlightColor =
      square.charCodeAt(0) % 2 ^ square.charCodeAt(1) % 2
        ? whiteSquareGrey
        : blackSquareGrey;

    (this.shadowRoot?.getElementById('chessStyle') as any).textContent += `
      chess-board::part(${square}) {
        background-color: ${highlightColor};
      }
    `;
  }

  onDragStart(e: CustomEvent) {
    const { source, piece } = e.detail;

    // do not pick up pieces if the game is over
    if (this._chessGame.game_over() || !this.isMyTurn()) {
      e.preventDefault();
      return;
    }

    // or if it's not that side's turn
    if (
      (this._chessGame.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (this._chessGame.turn() === 'b' && piece.search(/^w/) !== -1)
    ) {
      e.preventDefault();
      return;
    }
  }

  onDrop(e: CustomEvent) {
    const { source, target, setAction } = e.detail;

    this.removeGreySquares();

    // see if the move is legal
    const move = this._chessGame.move({
      from: source,
      to: target,
      promotion: 'q', // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) {
      setAction('snapback');
    } else {
      this.placePiece(source, target);
    }
  }

  onMouseOverSquare(e: CustomEvent) {
    const { square, piece } = e.detail;

    if (!this.isMyTurn() || this.isGameOver()) return;

    // get list of possible moves for this square
    const moves = this._chessGame.moves({
      square: square,
      verbose: true,
    });

    // exit if there are no moves available for this square
    if (moves.length === 0) {
      return;
    }

    // highlight the square they moused over
    this.greySquare(square);

    // highlight the possible squares for this piece
    for (const move of moves) {
      this.greySquare(move.to);
    }
  }

  async makeMove(move: ChessMove) {
    const previousMove = this._moves[this._moves.length - 1];
    const previousMoveHash = previousMove ? previousMove.move_hash : undefined;

    const move_entry: GameMoveEntry<ChessMove> = {
      author_pub_key: this.myAddress,
      game_hash: this.gameHash,
      game_move: move,
      previous_move_hash: previousMoveHash,
    };
    const m: MoveInfo<ChessMove> = { move_hash: undefined as any, move_entry };
    this._moves.push(m);
    this.requestUpdate();

    const hash = await this._chessService.makeMove(
      this.gameHash,
      previousMoveHash,
      move
    );

    m.move_hash = hash;

    if (this.isGameOver()) {
      // Publish result
      const amIWhite = this.amIWhite();
      const myColor = amIWhite ? 'White' : 'Black';
      const iResigned = m.move_entry.game_move.type === 'Resign';

      let winner: 'Black' | 'White' | 'Draw' = myColor;
      if (this._chessGame.in_draw() || this._chessGame.in_stalemate())
        winner = 'Draw';
      if (iResigned) winner = amIWhite ? 'Black' : 'White';

      let num_of_moves = this._moves.length;
      if (iResigned) num_of_moves--;

      const result: ChessGameResult = {
        white_player: amIWhite ? this.myAddress : this.getOpponent(),
        black_player: amIWhite ? this.getOpponent() : this.myAddress,
        num_of_moves,
        timestamp: Date.now(),
        winner: { [winner]: undefined } as any,
      };

      await this._chessService.publishResult(result);
    }

    this.announceIfGameEnded();
  }

  announceIfGameEnded() {
    if (this.isGameOver()) {
      this.dispatchEvent(
        new CustomEvent('game-ended', { bubbles: true, composed: true })
      );
    }
  }

  async placePiece(from: string, to: string) {
    const move: ChessMove = {
      type: 'PlacePiece',
      from,
      to,
    };
    this._chessGame.move({ from, to });
    this.requestUpdate();

    this.makeMove(move);
  }

  renderMoveList() {
    return html`
      <div class="column" style="flex: 1;">
        <span class="title">Move history</span>
        ${this._chessGame.history().length > 0
          ? html`
              <div class="flex-scrollable-parent">
                <div class="flex-scrollable-container">
                  <div class="flex-scrollable-y">
                    <div class="row" style="overflow-y: auto;">
                      <mwc-list>
                        ${this._chessGame
                          .history()
                          .filter((_: string, i: number) => i % 2 === 0)
                          .map(
                            (move: string, i: number) =>
                              html`<mwc-list-item>
                                ${i + 1}. ${move}
                              </mwc-list-item>`
                          )}
                      </mwc-list>
                      <mwc-list>
                        ${this._chessGame
                          .history()
                          .filter((_: string, i: number) => i % 2 === 1)
                          .map(
                            (move: string, i: number) =>
                              html`<mwc-list-item> ${move}</mwc-list-item>`
                          )}
                      </mwc-list>
                    </div>
                  </div>
                </div>
              </div>
            `
          : html`
              <div class="container fill center-content">
                <span class="placeholder">No moves played yet</span>
              </div>
            `}
      </div>
    `;
  }

  getResult() {
    if (this._chessGame.game_over()) {
      if (!this._chessGame.in_checkmate()) return 'Game Over: draw';
      if (this.isMyTurn())
        return `Checkmate: ${this.getOpponentNickname()} wins`;
      return `Checkmate: you win`;
    } else if (
      this._moves.length > 0 &&
      this._moves[this._moves.length - 1].move_entry.game_move.type === 'Resign'
    ) {
      const lastMove = this._moves[this._moves.length - 1];

      if (lastMove.move_entry.author_pub_key === this.myAddress)
        return `You resigned: ${this.getOpponentNickname()} wins`;
      else return `${this.getOpponentNickname()} resigned: you win`;
    } else {
      if (this.isMyTurn()) return `Your turn`;
      return `${this.getOpponentNickname()}'s turn`;
    }
  }

  isGameOver() {
    if (this._chessGame.game_over()) return true;
    const lastMove = this._moves[this._moves.length - 1];

    return lastMove && lastMove.move_entry.game_move.type === 'Resign';
  }

  renderGameInfo() {
    return html`
      <mwc-card style="height: 500px; min-width: 300px; align-self: center;">
        <div class="column board game-info" style="margin: 16px; flex: 1;">
          <span class="title">Opponent: ${this.getOpponentNickname()}</span>
          <span class="placeholder"
            >Started at:
            ${new Date(this._gameInfo.created_at).toLocaleString()}</span
          >
          <hr class="horizontal-divider" />
          ${this.renderMoveList()}
          <hr class="horizontal-divider" />
          <span style="font-size: 20px; text-align: center;"
            >${this.getResult()}</span
          >
          <mwc-button
            raised
            label="Resign"
            .disabled=${this.isGameOver()}
            @click=${() => this.makeMove({ type: 'Resign' })}
          ></mwc-button>
        </div>
      </mwc-card>
    `;
  }

  render() {
    if (!this._gameInfo)
      return html`<div class="column center-content" style="flex: 1;">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html`
      <style id="chessStyle"></style>
      <div class="row board" style="justify-content: center">
        <chess-board
          id="board"
          style="margin-right: 40px"
          .orientation=${this.amIWhite() ? 'white' : 'black'}
          ?draggable-pieces=${!this.isGameOver()}
          position="${this._chessGame.fen()}"
          @drag-start=${this.onDragStart}
          @drop=${this.onDrop}
          @mouseover-square=${this.onMouseOverSquare}
          @mouseout-square=${this.removeGreySquares}
        ></chess-board>
        ${this.renderGameInfo()}
      </div>
    `;
  }

  static elementDefintions = {
    'mwc-circular-progress': CircularProgress,
    'mwc-list': List,
    'mwc-list-item': ListItem,
    'mwc-card': Card,
    'mwc-button': Button,
    'chess-board': ChessBoardElement,
  };

  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: flex;
          flex: 1;
          flex-direction: column;
        }
        #board {
          height: 700px;
          width: 700px;
        }
        .game-info > span {
          margin-bottom: 16px;
        }
        .horizontal-divider {
          width: 100%;
          opacity: 0.6;
          margin-bottom: 16px;
          margin-top: 4px;
        }
      `,
    ];
  }
}
