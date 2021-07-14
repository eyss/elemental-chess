import { AppWebsocket, AdminWebsocket, CellId } from '@holochain/conductor-api';
import { Card } from 'scoped-material-components/mwc-card';
import { ContextProvider } from '@holochain-open-dev/context';
import { CircularProgress } from 'scoped-material-components/mwc-circular-progress';
import { sharedStyles } from './elements/sharedStyles';
import { appId, appUrl, CHESS_SERVICE_CONTEXT, isHoloEnv } from './constants';
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
  INVITATIONS_STORE_CONTEXT,
} from '@eyss/invitations';

import { LitElement, css, html } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { router } from './router';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import {
  HoloClient,
  HolochainClient,
  CellClient,
} from '@holochain-open-dev/cell-client';
import { Connection as WebSdkConnection } from '@holo-host/web-sdk';
import { EntryHashB64 } from '@holochain-open-dev/core-types';
import { ChessCurrentGames } from './elements/chess-current-games';

export class ChessApp extends ScopedElementsMixin(LitElement) {
  @property({ type: Array })
  _activeGameHash: string | undefined = undefined;

  @property()
  _gameEnded: boolean = false;

  @state()
  _loading = true;

  @state()
  _signedIn = false;

  _cellClient!: CellClient;

  _chessService!: ContextProvider<never>;
  _profilesStore!: ContextProvider<never>;
  _invitationStore!: ContextProvider<never>;

  signalHandler = (signal: any) => {
    if (signal.data.payload.GameStarted != undefined) {
      const gameHash = signal.data.payload.GameStarted[0];
      router.navigate(`/game/${gameHash}`);
    }
    if (this._invitationStore.value && isHoloEnv()) {
      (this._invitationStore.value as InvitationsStore).signalHandler(signal);
    }
  };

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

  createClient(): Promise<CellClient> {
    if (isHoloEnv()) return this.createHoloClient();
    else return this.createHolochainClient();
  }

  async connectToHolochain() {
    this._cellClient = await this.createClient();

    const profilesService = new ProfilesService(this._cellClient);

    const store = new ProfilesStore(profilesService);

    // Fetching our profile has a side-effect of executing init
    await store.fetchMyProfile();

    this._profilesStore = new ContextProvider(
      this,
      PROFILES_STORE_CONTEXT as never,
      store as any
    );

    const invitationService = new InvitationsService(this._cellClient);

    const invitationsStore = new InvitationsStore(invitationService, true);

    this._invitationStore = new ContextProvider(
      this,
      INVITATIONS_STORE_CONTEXT as never,
      invitationsStore as any
    );

    this._chessService = new ContextProvider(
      this,
      CHESS_SERVICE_CONTEXT as never,
      new ChessService(this._cellClient) as any
    );
  }

  async _onInvitationCompleted(event: any) {
    const opponent = event.detail.invitation.inviter;
    const gameHash = await (
      this._chessService.value as ChessService
    ).createGame(opponent);
    this.openGame(gameHash);
  }

  openGame(gameHash: EntryHashB64) {
    router.navigate(`/game/${gameHash}`);
  }

  async createHoloClient() {
    const connection = new WebSdkConnection(
      appUrl(),
      this.signalHandler,

      {
        app_name: 'elemental-chess',
      }
    );

    await connection.ready();
    await connection.signIn();

    this._signedIn = true;

    const appInfo = await connection.appInfo(appId());

    if (!appInfo.cell_data)
      throw new Error(`Holo appInfo() failed: ${JSON.stringify(appInfo)}`);

    const cellData = appInfo.cell_data[0];

    // TODO: remove this when chaperone is fixed
    if (!(cellData.cell_id[0] instanceof Uint8Array)) {
      cellData.cell_id = [
        new Uint8Array((cellData.cell_id[0] as any).data),
        new Uint8Array((cellData.cell_id[1] as any).data),
      ] as any;
    }
    const cellClient = new HoloClient(connection, cellData, {
      app_name: 'elemental-chess',
    });

    return cellClient;
  }

  async createHolochainClient() {
    const appWebsocket = await AppWebsocket.connect(
      appUrl() as string,
      12000,
      (signal: any) => {
        if (signal.data.payload.GameStarted != undefined) {
          const gameHash = signal.data.payload.GameStarted[0];
          router.navigate(`/game/${gameHash}`);
        }
      }
    );
    const appInfo = await appWebsocket.appInfo({
      installed_app_id: appId() as string,
    });

    const cellData = appInfo.cell_data[0];
    const cellClient = new HolochainClient(appWebsocket, cellData);

    return cellClient;
  }

  renderContent() {
    if (this._activeGameHash)
      return html` <div class="row center-content " style="flex: 1;">
        <mwc-button
          @click=${() => router.navigate('/')}
          label="Go back"
          icon="arrow_back"
          raised
          style="align-self: start; margin: 16px;"
        ></mwc-button>
        <chess-game
          .gameHash=${this._activeGameHash}
          @game-ended=${() => (this._gameEnded = true)}
        ></chess-game>
      </div>`;
    else
      return html`
        <div class="column center-content" style="flex: 1; margin: 100px;">
          <div class="row" style="flex: 1; width: 1200px; margin-bottom: 24px;">
            <create-invitation
              style="flex: 1; margin-right: 24px;"
            ></create-invitation>
            <invitations-list
              style="flex: 1;"
              @invitation-completed=${(e: CustomEvent) =>
                this._onInvitationCompleted(e)}
            ></invitations-list>
          </div>
          <div class="row" style="flex: 1; width: 1200px;">
            <mwc-card style="flex: 1; margin-right: 24px;">
              <div class="column" style="flex: 1; margin: 12px;">
                <span class="title" style="margin-bottom: 12px;">Players </span>
                <div class="flex-scrollable-parent">
                  <div class="flex-scrollable-container">
                    <div class="flex-scrollable-y">
                      <list-profiles></list-profiles>
                    </div>
                  </div>
                </div>
              </div>
            </mwc-card>
            <chess-game-results-history
              style="flex: 1; margin-right: 24px;"
            ></chess-game-results-history>
            <chess-current-games
              style="flex: 1;"
              @open-game=${(e: CustomEvent) => this.openGame(e.detail.gameHash)}
            ></chess-current-games>
          </div>
        </div>
      `;
  }

  renderLogout() {
    if (!isHoloEnv() || !this._signedIn) return html``;
    return html`
      <mwc-button
        label="LOGOUT"
        icon="logout"
        style="--mdc-theme-primary: white;"
        @click=${async () => {
          const c = (this._cellClient as any).connection;
          await c.signOut();
          await c.signIn();
          this._signedIn = false;
        }}
        slot="actionItems"
      ></mwc-button>
    `;
  }

  render() {
    if (this._loading)
      return html`<div class="fill center-content">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html`
      <mwc-top-app-bar style="flex: 1; display: flex;">
        <div slot="title">Elemental Chess</div>

        <div class="fill row" style="width: 100vw; height: 100%;">
          <profile-prompt style="flex: 1;">
            ${this.renderContent()}
          </profile-prompt>
        </div>
        ${this.renderLogout()}
      </mwc-top-app-bar>
    `;
  }

  static get scopedElements() {
    return {
      'mwc-circular-progress': CircularProgress,
      'mwc-top-app-bar': TopAppBar,
      'mwc-button': Button,
      'mwc-icon-button': IconButton,
      'mwc-card': Card,
      'profile-prompt': ProfilePrompt,
      'list-profiles': ListProfiles,
      'chess-game': ChessGame,
      'chess-current-games': ChessCurrentGames,
      'chess-game-results-history': ChessGameResultsHistory,
      'create-invitation': CreateInvitation,
      'invitations-list': InvitationsList,
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
