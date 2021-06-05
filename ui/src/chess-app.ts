import { LitElement, css, html } from 'lit';
import { property, query } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';

import { AppWebsocket, AdminWebsocket, CellId } from '@holochain/conductor-api';
import { Card } from 'scoped-material-components/mwc-card';
import { ContextProvider } from '@holochain-open-dev/context';
import { CircularProgress } from 'scoped-material-components/mwc-circular-progress';
import { sharedStyles } from './elements/sharedStyles';
import { router } from './router';
import { APP_URL, CHESS_SERVICE_CONTEXT } from './constants';
import { TopAppBar } from 'scoped-material-components/mwc-top-app-bar';
import { Button } from 'scoped-material-components/mwc-button';
import { IconButton } from 'scoped-material-components/mwc-icon-button';
import {
  ProfilePrompt,
  ProfilesService,
  ProfilesStore,
  ListProfiles,
  PROFILES_STORE_CONTEXT,
} from '@holochain-open-dev/profiles';
import { ChessService } from './chess.service';
import { ChessGame } from './elements/chess-game';
import { ChessGameResultsHistory } from './elements/chess-game-results-history';

import {
  CreateInvitation,
  InvitationsStore,
  InvitationsService,
  InvitationsList,
} from '@eyss/invitations';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { INVITATIONS_STORE_CONTEXT } from '@eyss/invitations/types';

export class ChessApp extends ScopedRegistryHost(LitElement) {
  @property({ type: Array })
  _activeGameHash: string | undefined = undefined;

  @property()
  _gameEnded: boolean = false;

  @property({ type: Array })
  _loading = true;

  _appWebsocket!: AppWebsocket;
  _adminWebsocket!: AdminWebsocket;
  _cellId!: CellId;

  _profilesStore!: ContextProvider<never>;
  _chessService!: ContextProvider<never>;

  _invitationStore!: ContextProvider<never>;

  async firstUpdated() {
    await this.connectToHolochain();

    router
      .on({
        '/game/:game': async params => {
          this._activeGameHash = params.game;
          this._gameEnded = false;
        },
        '*': async () => {
          this._activeGameHash = undefined;
        },
      })
      .resolve();
    this._loading = false;
  }

  async connectToHolochain() {
    this._appWebsocket = await AppWebsocket.connect(APP_URL, 300000, signal => {
      if (signal.data.payload.GameStarted != undefined) {
        const gameHash = signal.data.payload.GameStarted[0];
        router.navigate(`/game/${gameHash}`);
      }
    });

    const appInfo = await this._appWebsocket.appInfo({
      installed_app_id: 'test-app',
    });
    this._cellId = appInfo.cell_data[0].cell_id;

    const profilesService = new ProfilesService(
      this._appWebsocket as any,
      this._cellId
    );
    this._profilesStore = new ContextProvider(
      this,
      PROFILES_STORE_CONTEXT as never,
      new ProfilesStore(profilesService) as any
    );

    const invitationService = new InvitationsService(
      this._appWebsocket as any,
      this._cellId
    );

    this._invitationStore = new ContextProvider(
      this,
      INVITATIONS_STORE_CONTEXT as never,
      new InvitationsStore(invitationService, true) as any
    );

    this._chessService = new ContextProvider(
      this,
      CHESS_SERVICE_CONTEXT as never,
      new ChessService(this._appWebsocket, this._cellId) as any
    );
  }

  async _onInvitationCompleted(event: any) {
    console.log(event);
    const opponent = event.detail.invitation.inviter;
    const gameHash = await (
      this._chessService.value as ChessService
    ).createGame(opponent);
    router.navigate(`/game/${gameHash}`);
  }

  renderContent() {
    if (this._activeGameHash)
      return html` <div class="row center-content " style="flex: 1;">
        <mwc-button
          style="align-self: start;"
          @click=${() => router.navigate('/')}
          label="Go back"
          icon="arrow_back"
          raised
          id="back-button"
          style=${styleMap({
            display: this._gameEnded ? 'inherit' : 'none',
            'align-self': 'start',
            margin: '16px',
          })}
        ></mwc-button>
        <chess-game
          .gameHash=${this._activeGameHash}
          @game-ended=${() => (this._gameEnded = true)}
        ></chess-game>
      </div>`;
    else
      return html`
        <div class="column center-content" style="flex: 1; margin: 100px;">
          <div class="row" style="flex: 1; width: 1200px; margin-bottom: 42px;">
            <create-invitation
              style="flex: 1; margin-right: 42px;"
            ></create-invitation>
            <invitations-list
              style="flex: 1;"
              @invitation-completed=${(e: CustomEvent) =>
                this._onInvitationCompleted(e)}
            ></invitations-list>
          </div>
          <div class="row" style="flex: 1; width: 1200px;">
            <mwc-card style="flex: 1; margin-right: 42px;">
              <div class="column" style="flex: 1; margin: 16px;">
                <span class="title" style="margin-bottom: 16px;">Players </span>
                <list-profiles></list-profiles>
              </div>
            </mwc-card>
            <chess-game-results-history
              style="flex: 1;"
            ></chess-game-results-history>
          </div>
        </div>
      `;
  }

  render() {
    if (this._loading)
      return html`<div class="fill center-content">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html`
      <mwc-top-app-bar style="flex: 1; display: flex;">
        <div slot="title">Chess</div>

        <div class="fill row" style="width: 100vw; height: 100%;">
          <profile-prompt style="flex: 1;">
            ${this.renderContent()}
          </profile-prompt>
        </div>
      </mwc-top-app-bar>
    `;
  }

  static elementDefinitions = {
    'mwc-circular-progress': CircularProgress,
    'mwc-top-app-bar': TopAppBar,
    'mwc-button': Button,
    'mwc-icon-button': IconButton,
    'mwc-card': Card,
    'profile-prompt': ProfilePrompt,
    'list-profiles': ListProfiles,
    'chess-game': ChessGame,
    'chess-game-results-history': ChessGameResultsHistory,
    'create-invitation': CreateInvitation,
    'invitations-list': InvitationsList,
  };

  static get styles() {
    return [
      css`
        :host {
          display: flex;
        }

        .container {
          display: grid;
          width: 100%;
          height: 100%;
          grid-template-columns: repeat(2, 1fr);
          align-content: center;
          overflow: hidden;
        }

        .uno {
          display: flex;
          justify-content: center;
        }

        .dos {
          overflow-y: auto;
          width: 100%;
        }
      `,
      sharedStyles,
    ];
  }
}
