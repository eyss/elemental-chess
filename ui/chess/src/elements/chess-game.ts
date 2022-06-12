import { html, css, LitElement, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { contextProvided } from '@holochain-open-dev/context';
import { ChessBoardElement } from 'chessboard-element';
// @ts-ignore
import { Chess } from 'chess.js' 

import { StoreSubscriber} from 'lit-svelte-stores'; //, TaskSubscriber 

import {
  CircularProgress, 
  List,
  ListItem,
  Card,
  Button,
} from '@scoped-elements/material-web';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';

import { sharedStyles } from './sharedStyles';
import { ChessMove } from '../types';
import { chessStoreContext } from '../context';
import { ChessStore } from '../chess-store';
import { AgentPubKeyB64, HeaderHashB64 } from '@holochain-open-dev/core-types';
import { AgentAvatar } from '@holochain-open-dev/profiles';
import { Status } from '@holochain-open-dev/peer-status'

const whiteSquareGrey = '#a9a9a9';
const blackSquareGrey = '#696969';

const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(() => resolve(null), ms));

export class ChessGame extends ScopedElementsMixin(LitElement) {
  @property()
  gameHash!: string;

  @state()
  loading = true;

  _chessStyles!: string;

  @contextProvided({ context: chessStoreContext })
  _chessStore!: ChessStore;

  //_knownProfiles = new TaskSubscriber(
   // this,
    //() => this._chessStore.profilesStore.fetchAllProfiles()
//);
  _knownProfiles = new StoreSubscriber(
    this,
    () => this._chessStore.profilesStore.knownProfiles
  );
  _game = new StoreSubscriber(this, () =>
    this._chessStore.turnBasedGameStore.game(this.gameHash)
  );

  _elos = new StoreSubscriber(this, () => this._chessStore.eloStore.elos);

  _opponent_status!: StoreSubscriber<Status>

  get myAddress() {
    return this._chessStore.profilesStore.myAgentPubKey;
  }

  chessGame() {
    const chessGame = new Chess();
    for (const move of this._game.value.moves) {
      if (move.game_move_entry.game_move.type === 'PlacePiece') {
        const { from, to } = move.game_move_entry.game_move;
        chessGame.move({ from, to, promotion: 'q' });
      }
    }
    return chessGame;
  }

  updated(changedValues: PropertyValues) {
    super.updated(changedValues);

    const board = this.shadowRoot?.getElementById('board') as
      | ChessBoardElement
      | undefined;
    if (board && board.setPosition) {
      board.setPosition(this.chessGame().fen());
      board.requestUpdate();
    }
  }

  async getGameInfo(retriesLeft = 4): Promise<void> {
    try {
      await this._chessStore.fetchGameDetails(this.gameHash);
    } catch (e) {
      console.log(e);
      if (retriesLeft === 0) throw new Error(`Couldn't get game`);

      await sleep(200);
      return this.getGameInfo(retriesLeft - 1);
    }
  }

  async firstUpdated() {
    await this.getGameInfo();
    this._opponent_status = new StoreSubscriber(
      this,
      () => this._chessStore.peerStatusStore.subscribeToAgentStatus(this.getOpponent())
    );
    this.loading = false;

    this._chessStyles = '';
  }

  amIWhite() {
    return (
      this._game.value.entry.players[0] ===
      this._chessStore.profilesStore.myAgentPubKey
    );
  }

  isMyTurn() {
    const turnColor = this.chessGame().turn();
    const myColor = this.amIWhite() ? 'w' : 'b';

    return turnColor === myColor;
  }

  getOnlineStatus(pubKey:AgentPubKeyB64):string{
    if (pubKey === this._chessStore.profilesStore.myAgentPubKey) return ""
    return this._opponent_status.value
  }

  getOpponent(): string {
    return this._chessStore.turnBasedGameStore.opponent(this._game.value.entry);
  }

  getOpponentNickname(): string {
    return this._knownProfiles.value[this.getOpponent()].nickname;
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

    const game = this.chessGame();

    // do not pick up pieces if the game is over
    if (game.game_over() || !this.isMyTurn()) {
      e.preventDefault();
      return;
    }

    // or if it's not that side's turn
    if (
      (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)
    ) {
      e.preventDefault();
      return;
    }
  }

  onDrop(e: CustomEvent) {
    const { source, target, setAction } = e.detail;

    this.removeGreySquares();

    // see if the move is legal
    const move = this.chessGame().move({
      from: source,
      to: target,
      promotion: 'q', // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) {
      setAction('snapback');
    } else {
      const promotion = move.flags.includes('p') ? 'Queen' : undefined;
      this.placePiece(source, target, promotion);
    }
  }

  onMouseOverSquare(e: CustomEvent) {
    const { square, piece } = e.detail;

    if (!this.isMyTurn() || this.isGameOver()) return;
    // get list of possible moves for this square
    const moves = this.chessGame().moves({
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

  getMyScore(myLastMove: ChessMove) {
    if (myLastMove.type === 'Resign') return 0.0;
    if (this.chessGame().in_draw() || this.chessGame().in_stalemate())
      return 0.5;

    // If there is no draw and I just finished the game myself, means I won
    return 1.0;
  }

  async makeMove(move: ChessMove) {
    const numRetries = 10;
    let retryCount = 0;
    let moveHeaderHash: HeaderHashB64 | undefined;
    while (!moveHeaderHash && retryCount < numRetries) {
      try {
        moveHeaderHash = await this._chessStore.turnBasedGameStore.makeMove(
          this.gameHash,
          move
        );
      } catch (e) {
        // Retry if we can't see previous move hash yet
        if (
          JSON.stringify(e).includes("Could not make the move since we don't see the previous move from our opponent")
        ) {
          console.log(e)
          await sleep(1000);
        } else {
          console.log("unknown error: ",JSON.stringify(e))
          await sleep(1000);
          //throw e;
        }
      } 
      retryCount += 1;
    }
    if (!moveHeaderHash){
      console.log("network is busy, try again later"); //TODO put this message in the UI
      return
    }

    if (this.isGameOver()) {
      // Publish result
      const myScore = this.getMyScore(move);
      await sleep(1000)
      await this._chessStore.publishResultCloseGame(
        this.gameHash,
        moveHeaderHash,
        myScore
      );
    } else {
      this._chessStore.checkForMovesOnTimeout(moveHeaderHash,this._game.value.moves,this.gameHash)
    }
  }

  async placePiece(from: string, to: string, promotion: string | undefined) {
    const move: ChessMove = {
      type: 'PlacePiece',
      from,
      to,
      promotion,
    };

    this.makeMove(move);
  }

  renderMoveList() {
    return html`
      <div class="column" style="flex: 1;">
        <span class="title">Move History</span>
        ${this.chessGame().history().length > 0
          ? html`
              <div class="flex-scrollable-parent">
                <div class="flex-scrollable-container">
                  <div class="flex-scrollable-y">
                    <div class="row" style="overflow-y: auto;">
                      <mwc-list>
                        ${this.chessGame()
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
                        ${this.chessGame()
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
    const lastMove = this.lastMove();
    const game = this.chessGame();
    if (game.game_over()) {
      if (!game.in_checkmate()) return 'Game Over: draw';
      if (this.isMyTurn())
        return `Checkmate: ${this.getOpponentNickname()} wins`;
      return `Checkmate: you win`;
    } else if (
      lastMove &&
      lastMove.game_move_entry.game_move.type === 'Resign'
    ) {
      if (lastMove.game_move_entry.author_pub_key === this.myAddress)
        return `You resigned: ${this.getOpponentNickname()} wins`;
      else return `${this.getOpponentNickname()} resigned: you win`;
    } else {
      if (this.isMyTurn()) return `Your turn`;
      return `${this.getOpponentNickname()}'s turn`;
    }
  }

  lastMove() {
    if (this._game.value.moves.length === 0) return undefined;
    return this._game.value.moves[this._game.value.moves.length - 1];
  }

  isGameOver() {
    if (this.chessGame().game_over()) return true;
    const lastMove = this.lastMove();

    return lastMove && lastMove.game_move_entry.game_move.type === 'Resign';
  }

  renderPlayer(pubKey: AgentPubKeyB64) {
    return html`
      <div class="row ${this.getOnlineStatus(pubKey)}" style="align-items: center;">
          <agent-avatar .agentPubKey=${pubKey}></agent-avatar>
          <span style="flex: 1; font-size: 16px; margin-left: 8px;">${this._knownProfiles.value[pubKey].nickname}</span>
          <span class="${this.getOnlineStatus(pubKey)}-icon"></span>
          <span style="font-size: 16px">ELO: ${this._elos.value[pubKey]}</span>
      </div>
    `;
  }

  renderGameInfo() {
    return html`
      <mwc-card
        style="height: 500px; min-width: 300px; width: auto; align-self: center;"
      >
        <div class="column board game-info" style="margin: 16px; flex: 1;">
          ${this.renderPlayer(this.getOpponent())}
          <hr class="horizontal-divider" style="margin-top: 16px;" />
          ${this.renderMoveList()}
          <span class="placeholder"
            >Started at:
            ${new Date(
              this._game.value.entry.created_at
            ).toLocaleString()}</span
          >
          <span style="font-size: 20px; text-align: center;"
            >${this.getResult()}</span
          >
          <mwc-button
            raised
            label="Resign"
            .disabled=${this.isGameOver() || !this.isMyTurn()}
            @click=${() => this.makeMove({ type: 'Resign' })}
          ></mwc-button>
          <hr class="horizontal-divider" style="margin-top: 16px;" />

          ${this.renderPlayer(this._chessStore.profilesStore.myAgentPubKey)}
        </div>
      </mwc-card>
    `;
  }

  render() {
    if (this.loading)
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
          @drag-start=${this.onDragStart}
          @drop=${this.onDrop}
          @mouseover-square=${this.onMouseOverSquare}
          @mouseout-square=${this.removeGreySquares}
        ></chess-board>
        ${this.renderGameInfo()}
      </div>
    `;
  }

  static get scopedElements() {
    return {
      'mwc-circular-progress': CircularProgress,
      'mwc-list': List,
      'mwc-list-item': ListItem,
      'mwc-card': Card,
      'mwc-button': Button,
      'chess-board': ChessBoardElement,
      'agent-avatar': AgentAvatar,
    };
  }

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
        .online-icon,
        .idle-icon,
        .offline-icon {
          margin-right: 4px; 
          border-radius: 50%;
        }
        .online-icon {
          height: 16px;
          width: 16px;
          background-color: #00ef00;
        }
        .idle {
          opacity: 0.7;
        }
        .idle-icon {      
          height: 16px;
          width: 16px;
          background-color: #dfc800;
        }
        .offline {
          opacity: 0.5;
        }
        .offline-icon {
          height: 6px;
          width: 6px;
          border: 5px solid #7c7c7c;
        }
      `,
    ];
  }
}
