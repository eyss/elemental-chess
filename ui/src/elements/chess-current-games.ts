import { html } from 'lit';
import { state } from 'lit/decorators.js';
import { requestContext } from '@holochain-open-dev/context';

import {
  ProfilesStore,
  PROFILES_STORE_CONTEXT,
} from '@holochain-open-dev/profiles';
import { Card } from 'scoped-material-components/mwc-card';
import { List } from 'scoped-material-components/mwc-list';
import { ListItem } from 'scoped-material-components/mwc-list-item';
import { ChessService } from '../chess.service';
import { ChessGameResult, GameEntry } from '../types';
import { Icon } from 'scoped-material-components/mwc-icon';
import { sharedStyles } from './sharedStyles';
import { CHESS_SERVICE_CONTEXT } from '../constants';
import { MobxLitElement } from '@adobe/lit-mobx';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import { Dictionary } from '@holochain-open-dev/core-types';
import { Button } from 'scoped-material-components/mwc-button';
import { CircularProgress } from 'scoped-material-components/mwc-circular-progress';

export class ChessCurrentGames extends ScopedElementsMixin(MobxLitElement) {
  @state()
  _chessGames!: Dictionary<GameEntry>;

  @requestContext(CHESS_SERVICE_CONTEXT)
  _chessService!: ChessService;

  @requestContext(PROFILES_STORE_CONTEXT)
  _profilesStore!: ProfilesStore;

  async firstUpdated() {
    const gameHashes = await this._chessService.getMyCurrentGames();
    const games: Dictionary<GameEntry> = {};

    const promises = gameHashes.map(async gameHash => {
      games[gameHash] = await this._chessService.getGame(gameHash);
      await this._profilesStore.fetchAgentProfile(
        this.getOpponentAddress(games[gameHash])
      );
    });

    await Promise.all(promises);
    console.log(this._profilesStore.profiles)
    this._chessGames = games;
  }

  getOpponentAddress(game: GameEntry): string {
    const myAddress = this._profilesStore.myAgentPubKey;
    return game.players.find(p => p !== myAddress) as string;
  }

  renderGames() {
    if (Object.keys(this._chessGames).length === 0)
      return html`<div class="column center-content" style="flex: 1;">
        <span class="placeholder" style="margin: 16px;"
          >You are not playing any game at the moment</span
        >
      </div>`;

    return html`<div class="flex-scrollable-parent">
      <div class="flex-scrollable-container">
        <div class="flex-scrollable-y">
          <mwc-list disabled>
            ${Object.entries(this._chessGames).map(
              ([hash, game]) =>
                html` <div class="row center-content">
                  <mwc-list-item twoline style="flex: 1;">
                    <span
                      >vs
                      ${this._profilesStore.profileOf(
                        this.getOpponentAddress(game)
                      ).nickname}
                    </span>
                    <span slot="secondary"
                      >Started at
                      ${new Date(game.created_at).toLocaleString()}</span
                    >
                  </mwc-list-item>
                  <mwc-button
                    label="OPEN"
                    @click=${() =>
                      this.dispatchEvent(
                        new CustomEvent('open-game', {
                          detail: {
                            gameHash: hash,
                          },
                          composed: true,
                          bubbles: true,
                        })
                      )}
                  ></mwc-button>
                </div>`
            )}
          </mwc-list>
        </div>
      </div>
    </div>`;
  }

  render() {
    if (!this._chessGames)
      return html`<div class="container">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html`
      <mwc-card style="flex: 1; min-width: 270px;">
        <div class="column" style="margin: 16px; flex: 1;">
          <span class="title">Current Games</span>
          ${this.renderGames()}
        </div>
      </mwc-card>
    `;
  }

  static get scopedElements() {
    return {
      'mwc-icon': Icon,
      'mwc-card': Card,
      'mwc-list': List,
      'mwc-button': Button,
      'mwc-list-item': ListItem,
      'mwc-circular-progress': CircularProgress,
    };
  }

  static styles = [sharedStyles];
}
