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
import { serializeHash } from '@holochain-open-dev/core-types';
import { BaseElement, connectDeps } from '@holochain-open-dev/common';
import { CircularProgress } from 'scoped-material-components/mwc-circular-progress';
import { sharedStyles } from './elements/sharedStyles';
import { router } from './router';
import { APP_URL } from './constants';
import {
  InstallDnaDialog,
  InstalledCells,
  ComposeZomes,
  DiscoverDnas,
  CompositoryService,
  connectService,
  PublishZome,
} from '@compository/lib';
import { TopAppBar } from 'scoped-material-components/mwc-top-app-bar';
import { Button } from 'scoped-material-components/mwc-button';
import { IconButton } from 'scoped-material-components/mwc-icon-button';
import {
  ProfilePrompt,
  ProfilesService,
  ProfilesStore,
} from '@holochain-open-dev/profiles';
import { ChessService } from './chess.service';
import { ChessGame } from './elements/chess-game';
import { ChessGameResultsHistory } from './elements/chess-game-results-history';

export class ChessApp extends BaseElement {
  @property({ type: Array })
  _activeGameHash: string | undefined = undefined;

  @property({ type: Array })
  _loading = true;

  _appWebsocket!: AppWebsocket;
  _adminWebsocket!: AdminWebsocket;
  _cellId!: CellId;

  _chessService!: ChessService;
  _profilesStore!: ProfilesStore;

  async firstUpdated() {
    await this.connectToHolochain();

    router
      .on({
        '/game/:game': async params => {
          this._activeGameHash = params.game;
        },
        '*': async () => {
          this._activeGameHash = undefined;
        },
      })
      .resolve();
    this._loading = false;
  }

  async connectToHolochain() {
    this._appWebsocket = await AppWebsocket.connect(APP_URL, 300000);

    const appInfo = await this._appWebsocket.appInfo({
      installed_app_id: 'test-app',
    });
    this._cellId = appInfo.cell_data[0].cell_id;

    const profilesService = new ProfilesService(
      this._appWebsocket as any,
      this._cellId
    );
    this._profilesStore = new ProfilesStore(profilesService);

    this._chessService = new ChessService(this._appWebsocket, this._cellId);

    this.defineScopedElement(
      'profile-prompt',
      connectDeps(ProfilePrompt, this._profilesStore)
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
    //this.createGame();
  }

  async createGame() {
    await this._profilesStore.fetchAllProfiles();
    const allAgentPubKeys = Object.keys(this._profilesStore.profiles);
    console.log(allAgentPubKeys);
    if (allAgentPubKeys.length > 1 && !this._activeGameHash) {
      const opponent: string = allAgentPubKeys.find(
        p => p !== serializeHash(this._cellId[1])
      ) as string;

      const gameHash = await this._chessService.createGame(opponent);
      router.navigate(`/game/${gameHash}`);
    }
  }

  renderContent() {
    if (this._activeGameHash)
      return html`<chess-game .gameHash=${this._activeGameHash}></chess-game>`;
    else return html`<chess-game-results-history></chess-game-results-history>`;
  }

  render() {
    if (this._loading)
      return html`<div class="fill center-content">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    return html`
      <mwc-top-app-bar style="flex: 1; display: flex;">
        <div slot="title">Chess</div>

        <div class="fill row" style="width: 100vw; height: 100%; ">
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
        li {
          margin-bottom: 8px;
        }
      `,
      sharedStyles,
    ];
  }
}
