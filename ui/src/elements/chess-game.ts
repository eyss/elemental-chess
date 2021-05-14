import { LitElement, html, css, property } from 'lit-element';
import 'chessboard-element';
import * as Chess from 'chess.js';
import { BaseElement, DepsElement } from '@holochain-open-dev/common';
import ConductorApi from '@holochain/conductor-api';
import * as msgpack from '@msgpack/msgpack';
import { CircularProgress } from 'scoped-material-components/mwc-circular-progress';
import { List } from 'scoped-material-components/mwc-list';

import { sharedStyles } from './sharedStyles';
import { ChessService } from '../chess.service';
import { ChessMove, GameInfo, GameMoveEntry, MoveInfo } from '../types';
import { serializeHash } from '@holochain-open-dev/core-types';
import { ProfilesStore } from '@holochain-open-dev/profiles';

const whiteSquareGrey = '#a9a9a9';
const blackSquareGrey = '#696969';

export abstract class ChessGame
  extends BaseElement
  implements DepsElement<{ chess: ChessService; profiles: ProfilesStore }> {
  @property()
  gameHash!: string;

  @property()
  _gameInfo!: GameInfo<ChessMove>;

  _chessGame!: Chess.ChessInstance;
  _chessStyles!: string;

  abstract get _deps(): { chess: ChessService; profiles: ProfilesStore };

  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: flex;
          flex: 1;
          flex-direction: column;
        }
        .board {
          height: 70vh;
        }
        .game-info > span {
          margin-bottom: 16px;
        }
      `,
    ];
  }

  listenForOpponentMove() {
    const hcConnection = this._deps.chess.appWebsocket;
    ConductorApi.AppWebsocket.connect(
      hcConnection.client.socket.url,
      15000,
      signal => {
        const payload = signal.data.payload;
        if (payload.Move) {
          const game_hash = payload.Move.move_entry.game_hash;
          if (game_hash !== this.gameHash) return;

          const move_entry = payload.Move.move_entry;
          move_entry.game_move = msgpack.decode(move_entry.game_move);

          this._gameInfo?.moves.push(move_entry);

          const { from, to } = move_entry.game_move;
          const moveString = `${from}-${to}`;

          this._chessGame.move(moveString, { sloppy: true });
          (this.shadowRoot?.getElementById('board') as any).move(moveString);

          this.requestUpdate();
        }
      }
    );
  }

  async firstUpdated() {
    this._gameInfo = await this._deps.chess.getGameInfo(this.gameHash);
    await this._deps.profiles.fetchAgentProfile(this.getOpponent());

    this._chessGame = new Chess.Chess();

    this._chessStyles = '';

    this.listenForOpponentMove();
  }

  get myAddress() {
    return serializeHash(this._deps.chess.cellId[1]);
  }

  amIWhite() {
    return this._gameInfo?.game_entry.players[0] === this.myAddress;
  }

  isMyTurn() {
    const turnColor = this._chessGame.turn();
    const myColor = this.amIWhite() ? 'w' : 'b';

    return turnColor === myColor;
  }

  getOpponent(): string {
    return this._gameInfo.game_entry.players.find(
      player => player !== this.myAddress
    ) as string;
  }

  getOpponentNickname(): string {
    return this._deps.profiles.profileOf(this.getOpponent()).nickname;
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
      this.makeMove(source, target);
    }
  }

  onMouseOverSquare(e) {
    const { square, piece } = e.detail;

    if (!this.isMyTurn()) return;

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

  async makeMove(from: Chess.Square, to: Chess.Square) {
    const move: ChessMove = {
      type: 'PlacePiece',
      from,
      to,
    };
    const previousMove = this._gameInfo?.moves[this._gameInfo.moves.length - 1];
    const previousMoveHash = previousMove ? previousMove.move_hash : undefined;

    const move_entry: GameMoveEntry<ChessMove> = {
      author_pub_key: this.myAddress,
      game_hash: this.gameHash,
      game_move: move,
      previous_move_hash: previousMoveHash,
    };
    this._gameInfo?.moves.push({ move_hash: undefined, move_entry } as any);
    this._chessGame.move({ from, to });
    this.requestUpdate();

    const hash = await this._deps.chess.makeMove(
      this.gameHash,
      previousMoveHash,
      move
    );

    // TODO: insert hash
  }

  renderMove(gameMove: ChessMove) {
    if (gameMove.type === 'PlacePiece')
      return `${gameMove.from}->${gameMove.to}`;
  }

  renderMoveList() {
    return html`
      <h3>Move history</h3>
      <div class="row" style="overflow-y: auto;">
        <mwc-list>
          ${this._gameInfo?.moves
            .filter(m => m.move_entry.game_move.type === 'PlacePiece')
            .filter((_, i) => i % 2 === 0)
            .map(
              (move, i) =>
                html`<mwc-list-item>
                  ${i * 2 + 1}. ${this.renderMove(move.move_entry.game_move)}
                </mwc-list-item>`
            )}
        </mwc-list>
        <mwc-list>
          ${this._gameInfo?.moves
            .filter((_, i) => i % 2 === 1)
            .map(
              (move, i) =>
                html`<mwc-list-item>
                  ${i * 2 + 2}.
                  ${this.renderMove(move.move_entry.game_move)}</mwc-list-item
                >`
            )}
        </mwc-list>
      </div>
    `;
  }

  getResult() {
    if (this._chessGame.game_over()) {
      if (!this._chessGame.in_checkmate()) return 'Game Over: Draw';
      if (this.isMyTurn())
        return `Game Over: ${this.getOpponentNickname()} wins!`;
      return `Game Over: You win!`;
    } else {
      if (this.isMyTurn()) return `Your turn`;
      return `${this.getOpponentNickname()}'s turn`;
    }
  }

  renderGameInfo() {
    return html`
      <div class="column board game-info">
        <span style="font-size: 24px;">${this.getResult()}</span>
        <span>Opponent: ${this.getOpponentNickname()}</span>
        <span
          >Created at:
          ${new Date(
            this._gameInfo?.game_entry.created_at
          ).toLocaleString()}</span
        >
        ${this.renderMoveList()}
      </div>
    `;
  }

  render() {
    if (!this._gameInfo)
      return html`<div class="container">
        <mwc-circular-progress></mwc-circular-progress>
      </div>`;

    return html`
      <style id="chessStyle"></style>
      <div class="row board" style="justify-content: center">
        <chess-board
          id="board"
          style="width: 700px; margin-right: 40px"
          .orientation=${this.amIWhite() ? 'white' : 'black'}
          draggable-pieces
          @drag-start=${this.onDragStart}
          @drop=${this.onDrop}
          @mouseover-square=${this.onMouseOverSquare}
          @mouseout-square=${this.removeGreySquares}
        ></chess-board>
        ${this.renderGameInfo()}
      </div>
    `;
  }

  getScopedElements() {
    return {
      'mwc-circular-progress': CircularProgress,
      'mwc-list': List,
    };
  }
}
