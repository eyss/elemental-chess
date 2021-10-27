import { AppWebsocket } from '@holochain/conductor-api';
import {
  Card,
  TopAppBar,
  CircularProgress,
  Button,
  IconButton,
} from '@scoped-elements/material-web';
import { ContextProvider, Context } from '@lit-labs/context';
import {
  ProfilePrompt,
  ListProfiles,
  profilesStoreContext,
  ProfilesStore,
  AgentAvatar,
} from '@holochain-open-dev/profiles';

import {
  CreateInvitation,
  InvitationsStore,
  InvitationsList,
  invitationsStoreContext,
} from '@eyss/invitations';

import { LitElement, css, html } from 'lit';
import { state } from 'lit/decorators.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements';
import {
  HoloClient,
  HolochainClient,
  CellClient,
} from '@holochain-open-dev/cell-client';
import WebSdk from '@holo-host/web-sdk';
const WebSdkConnection = WebSdk.Connection;

import { EntryHashB64 } from '@holochain-open-dev/core-types';
import { GameResultsHistory, EloRanking, eloStoreContext } from '@eyss/elo';
import {
  MyCurrentGames,
  turnBasedGameStoreContext,
} from '@eyss/turn-based-game';
import {
  ChessGame,
  ChessStore,
  chessStoreContext,
  sharedStyles,
} from '@eyss/chess';

import { router } from './router';

import { appId, appUrl, isHoloEnv } from './constants';
import { StoreSubscriber } from 'lit-svelte-stores';

export class ChessApp extends ScopedElementsMixin(LitElement) {
  @state()
  _activeGameHash: string | undefined = undefined;

  @state()
  _loading = true;

  @state()
  _signedIn = false;

  _cellClient!: CellClient;

  _chessStore!: ContextProvider<Context<ChessStore>>;
  _profilesStore!: ContextProvider<Context<ProfilesStore>>;
  _invitationStore!: ContextProvider<Context<InvitationsStore>>;

  _myProfile = new StoreSubscriber(
    this,
    () => this._profilesStore?.value.myProfile
  );

  signalHandler = (signal: any) => {
    if (signal.data.payload.type === 'GameStarted') {
      const gameHash = signal.data.payload.game_hash;
      router.navigate(`/game/${gameHash}`);
    }
    if (this._invitationStore.value && isHoloEnv()) {
      (this._invitationStore.value as InvitationsStore).signalHandler(signal);
    }
  };

  async firstUpdated() {
    await this.connectToHolochain();

    router
      .on('/game/:game', (params: any) => {
        this._activeGameHash = params.data.game;
      })
      .on('/', () => {
        this._activeGameHash = undefined;
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

    const chessStore = new ChessStore(this._cellClient);

    // Fetching our profile has a side-effect of executing init
    await chessStore.profilesStore.fetchMyProfile();

    this._profilesStore = new ContextProvider(
      this,
      profilesStoreContext,
      chessStore.profilesStore
    );

    const invitationsStore = new InvitationsStore(this._cellClient, {
      clearOnInvitationComplete: true,
    });

    this._invitationStore = new ContextProvider(
      this,
      invitationsStoreContext,
      invitationsStore
    );

    this._chessStore = new ContextProvider(this, chessStoreContext, chessStore);

    new ContextProvider(
      this,
      turnBasedGameStoreContext,
      chessStore.turnBasedGameStore
    );
    new ContextProvider(this, eloStoreContext, chessStore.eloStore);

    this._cellClient.addSignalHandler(this.signalHandler);
  }

  async _onInvitationCompleted(event: any) {
    const opponent = event.detail.invitation.inviter;
    const gameHash = await this._chessStore.value.createGame(opponent);
    this.openGame(gameHash);
  }

  openGame(gameHash: EntryHashB64) {
    router.navigate(`/game/${gameHash}`);
  }

  async createHoloClient() {
    const connection = new WebSdkConnection(appUrl(), null, {
      app_name: 'elemental-chess',
      skip_registration: true,
    });

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
        <chess-game .gameHash=${this._activeGameHash}></chess-game>
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
            <elo-ranking style="flex: 1; margin-right: 24px;"></elo-ranking>
            <game-results-history
              style="flex: 1; margin-right: 24px;"
            ></game-results-history>
            <my-current-games
              style="flex: 1;"
              @open-game=${(e: CustomEvent) => this.openGame(e.detail.gameHash)}
            ></my-current-games>
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

  renderMyProfile() {
    if (!this._myProfile.value) return html``;
    return html`
      <div class="row center-content" slot="actionItems">
        <agent-avatar
          .agentPubKey=${this._profilesStore.value.myAgentPubKey}
        ></agent-avatar>
        <span style="margin: 0 16px;">${this._myProfile.value.nickname}</span>
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
        ${this._activeGameHash
          ? html`
              <mwc-icon-button
                icon="arrow_back"
                slot="navigationIcon"
                @click=${() => router.navigate('/')}
              ></mwc-icon-button>
            `
          : html``}
        <div slot="title">Elemental Chess</div>

        <div class="fill row" style="width: 100vw; height: 100%;">
          <profile-prompt style="flex: 1;">
            ${this.renderContent()}
          </profile-prompt>
        </div>
        ${this.renderMyProfile()} ${this.renderLogout()}
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
      'elo-ranking': EloRanking,
      'agent-avatar': AgentAvatar,
      'list-profiles': ListProfiles,
      'chess-game': ChessGame,
      'my-current-games': MyCurrentGames,
      'game-results-history': GameResultsHistory,
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
