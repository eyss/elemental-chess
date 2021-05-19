import {
  Constructor,
  css,
  html,
  LitElement,
  property,
  query,
} from 'lit-element';
import { AppWebsocket, AdminWebsocket, CellId } from '@holochain/conductor-api';
import { Card } from 'scoped-material-components/mwc-card';
import { BaseElement, connectDeps } from '@holochain-open-dev/common';
import { CircularProgress } from 'scoped-material-components/mwc-circular-progress';
import { sharedStyles } from './elements/sharedStyles';
import { router } from './router';
import { APP_URL } from './constants';
import { TopAppBar } from 'scoped-material-components/mwc-top-app-bar';
import { Button } from 'scoped-material-components/mwc-button';
import { IconButton } from 'scoped-material-components/mwc-icon-button';
import {
  ProfilePrompt,
  ProfilesService,
  ProfilesStore,
  ListProfiles,
} from '@holochain-open-dev/profiles';
import { ChessService } from './chess.service';
import { ChessGame } from './elements/chess-game';
import { ChessGameResultsHistory } from './elements/chess-game-results-history';
import { styleMap } from 'lit-html/directives/style-map';

import {
  CreateInvitation,
  InvitationsStore,
  InvitationsService,
  InvitationsList,
} from '@eyss/invitations';

export class ChessApp extends BaseElement {
  @property({ type: Array })
  _activeGameHash: string | undefined = undefined;

  @property()
  _gameEnded: boolean = false;

  @property({ type: Array })
  _loading = true;

  _appWebsocket!: AppWebsocket;
  _adminWebsocket!: AdminWebsocket;
  _cellId!: CellId;

  _chessService!: ChessService;
  _profilesStore!: ProfilesStore;

  _invitationStore!: InvitationsStore;
  _invitationService!: InvitationsService;

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
      } else {
        this._invitationStore.signalHandler(signal);
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
    this._profilesStore = new ProfilesStore(profilesService);

    this._invitationService = new InvitationsService(
      this._appWebsocket as any,
      this._cellId
    );

    this._invitationStore = new InvitationsStore(
      this._invitationService as any,
      this._profilesStore,
      true
    );

    this._chessService = new ChessService(this._appWebsocket, this._cellId);

    this.defineScopedElement(
      'profile-prompt',
      connectDeps(ProfilePrompt, this._profilesStore)
    );
    this.defineScopedElement(
      'list-profiles',
      connectDeps(ListProfiles, this._profilesStore)
    );

    this.defineScopedElement(
      'chess-game',
      connectDeps(ChessGame, {
        chess: this._chessService,
        profiles: this._profilesStore,
      })
    );
    this.defineScopedElement(
      'chess-game-results-history',
      connectDeps(ChessGameResultsHistory, {
        chess: this._chessService,
        profiles: this._profilesStore,
      })
    );

    this.defineScopedElement(
      'create-invitation',
      connectDeps(CreateInvitation, this._invitationStore)
    );

    this.defineScopedElement(
      'invitations-list',
      connectDeps(InvitationsList, this._invitationStore)
    );
  }

  async _onInvitationCompleted(event: any) {
    console.log(event)
    const opponent = event.detail.invitation.inviter;
    const gameHash = await this._chessService.createGame(opponent);
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

  getScopedElements(): any {
    return {
      'mwc-circular-progress': CircularProgress,
      'mwc-top-app-bar': TopAppBar,
      'mwc-button': Button,
      'mwc-icon-button': IconButton,
      'mwc-card': Card,
    };
  }

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
