import { html } from 'lit';
import { state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { ScopedRegistryHost } from '@lit-labs/scoped-registry-mixin';
import { MobxLitElement } from '@adobe/lit-mobx';

import { ProfilesStore } from '@holochain-open-dev/profiles';
import { ChessService } from '../chess.service';
import { requestContext } from '@holochain-open-dev/context';


import { sharedStyles } from './sharedStyles';

import { Icon } from 'scoped-material-components/mwc-icon';
import { Card } from 'scoped-material-components/mwc-card';
import { List } from 'scoped-material-components/mwc-list';
import { ListItem } from 'scoped-material-components/mwc-list-item';
import { ChessGameResult, CHESS_APP_STORE_CONTEXT } from '../types';


/**
 * @element chess-game-result-history
 */
 export class ChessGameResultsHistory extends ScopedRegistryHost(MobxLitElement) {
   
   @state()
   _chessGameResults!: Array<[string, ChessGameResult]>;

   @requestContext(CHESS_APP_STORE_CONTEXT)
   _store!:{ chess: ChessService; profiles: ProfilesStore };;


  async firstUpdated() {
    this._chessGameResults = await this._store.chess.getMyGameResults();

    const promises = this._chessGameResults.map(r =>
      this._store.profiles.fetchAgentProfile(this.getOpponentAddress(r[1]))
    );
    await Promise.all(promises);
  }

  getOpponentAddress(result: ChessGameResult) {
    const myAddress = this._store.profiles.myAgentPubKey;
    return result.black_player === myAddress
      ? result.black_player
      : result.white_player;
  }

  getResult(result: ChessGameResult) {
    const winner = Object.keys(result.winner)[0];
    if (winner === 'Draw') return 'Draw';

    const myAddress = this._store.profiles.myAgentPubKey;

    const winnerAddress =
      winner === 'White' ? result.white_player : result.black_player;
    return myAddress === winnerAddress ? 'Won' : 'Lost';
  }

  getIcon(result: ChessGameResult) {
    if (this.getResult(result) === 'Draw') return 'drag_handle';
    if (this.getResult(result) === 'Won') return 'thumb_up';
    if (this.getResult(result) === 'Lost') return 'thumb_down';
  }

  getColor(result: ChessGameResult) {
    if (this.getResult(result) === 'Draw') return 'grey';
    if (this.getResult(result) === 'Won') return 'green';
    return 'red';
  }

  getSummary() {
    let summary = {
      Draw: 0,
      Lost: 0,
      Won: 0,
    };

    for (const result of this._chessGameResults) {
      summary[this.getResult(result[1])]++;
    }

    return summary;
  }

  renderResults() {
    if (this._chessGameResults.length === 0)
      return html`<div class="column center-content" style="flex: 1;">
        <span class="placeholder">There are no games in your history yet</span>
      </div>`;

    return html`<div class="flex-scrollable-parent">
      <div class="flex-scrollable-container">
        <div class="flex-scrollable-y">
          <mwc-list disabled>
            ${this._chessGameResults.map(
              result =>
                html`<mwc-list-item twoline graphic="icon">
                  <span
                    >vs
                    ${this._store.profiles.profileOf(
                      this.getOpponentAddress(result[1])
                    ).nickname}
                  </span>
                  <span slot="secondary"
                    >${new Date(result[1].timestamp).toLocaleString()}</span
                  >
                  <mwc-icon
                    slot="graphic"
                    style=${styleMap({
                      color: this.getColor(result[1]),
                    })}
                    >${this.getIcon(result[1])}</mwc-icon
                  >
                </mwc-list-item>`
            )}
          </mwc-list>
        </div>
      </div>
    </div>`;
  }

  render() {
    if (!this._chessGameResults)
      return html`<div class="container">
        <mwc-circular-progress indeterminate></mwc-circular-progress>
      </div>`;

    const summary = this.getSummary();

    return html`
      <mwc-card style="flex: 1; min-width: 270px;">
        <div class="column" style="margin: 16px; flex: 1;">
          <span class="title">Game History</span>
          ${this.renderResults()}
          <div class="row center-content">
            <span class="placeholder"
              >Summary: ${summary.Won} ${summary.Won === 1 ? 'win' : 'wins'},
              ${summary.Lost} ${summary.Lost === 1 ? 'loss' : 'losses'},
              ${summary.Draw} ${summary.Draw === 1 ? 'draw' : 'draws'}</span
            >
          </div>
        </div>
      </mwc-card>
    `;
  }

  getScopedElements() {
    return {
      'mwc-icon': Icon,
      'mwc-card': Card,
      'mwc-list': List,
      'mwc-list-item': ListItem,
    };
  }

  static styles = [sharedStyles];
 }





// import { BaseElement, DepsElement } from '@holochain-open-dev/common';
// import { property } from 'lit-element';
// import { html } from 'lit-html';
// import { ProfilesStore } from '@holochain-open-dev/profiles';
// import { ChessService } from '../chess.service';
// import { ChessGameResult } from '../types';
// import { styleMap } from 'lit-html/directives/style-map';
// import { sharedStyles } from './sharedStyles';

// import { Icon } from 'scoped-material-components/mwc-icon';
// import { Card } from 'scoped-material-components/mwc-card';
// import { List } from 'scoped-material-components/mwc-list';
// import { ListItem } from 'scoped-material-components/mwc-list-item';

// export abstract class ChessGameResultsHistory
//   extends BaseElement
//   implements DepsElement<{ chess: ChessService; profiles: ProfilesStore }>
// {
//   @property()
//   _chessGameResults!: Array<[string, ChessGameResult]>;

//   abstract get _deps(): { chess: ChessService; profiles: ProfilesStore };

//   async firstUpdated() {
//     this._chessGameResults = await this._deps.chess.getMyGameResults();

//     const promises = this._chessGameResults.map(r =>
//       this._deps.profiles.fetchAgentProfile(this.getOpponentAddress(r[1]))
//     );
//     await Promise.all(promises);
//   }

//   getOpponentAddress(result: ChessGameResult) {
//     const myAddress = this._deps.profiles.myAgentPubKey;
//     return result.black_player === myAddress
//       ? result.black_player
//       : result.white_player;
//   }

//   getResult(result: ChessGameResult) {
//     const winner = Object.keys(result.winner)[0];
//     if (winner === 'Draw') return 'Draw';

//     const myAddress = this._deps.profiles.myAgentPubKey;

//     const winnerAddress =
//       winner === 'White' ? result.white_player : result.black_player;
//     return myAddress === winnerAddress ? 'Won' : 'Lost';
//   }

//   getIcon(result: ChessGameResult) {
//     if (this.getResult(result) === 'Draw') return 'drag_handle';
//     if (this.getResult(result) === 'Won') return 'thumb_up';
//     if (this.getResult(result) === 'Lost') return 'thumb_down';
//   }

//   getColor(result: ChessGameResult) {
//     if (this.getResult(result) === 'Draw') return 'grey';
//     if (this.getResult(result) === 'Won') return 'green';
//     return 'red';
//   }

//   getSummary() {
//     let summary = {
//       Draw: 0,
//       Lost: 0,
//       Won: 0,
//     };

//     for (const result of this._chessGameResults) {
//       summary[this.getResult(result[1])]++;
//     }

//     return summary;
//   }

//   renderResults() {
//     if (this._chessGameResults.length === 0)
//       return html`<div class="column center-content" style="flex: 1;">
//         <span class="placeholder">There are no games in your history yet</span>
//       </div>`;

//     return html`<div class="flex-scrollable-parent">
//       <div class="flex-scrollable-container">
//         <div class="flex-scrollable-y">
//           <mwc-list disabled>
//             ${this._chessGameResults.map(
//               result =>
//                 html`<mwc-list-item twoline graphic="icon">
//                   <span
//                     >vs
//                     ${this._deps.profiles.profileOf(
//                       this.getOpponentAddress(result[1])
//                     ).nickname}
//                   </span>
//                   <span slot="secondary"
//                     >${new Date(result[1].timestamp).toLocaleString()}</span
//                   >
//                   <mwc-icon
//                     slot="graphic"
//                     style=${styleMap({
//                       color: this.getColor(result[1]),
//                     })}
//                     >${this.getIcon(result[1])}</mwc-icon
//                   >
//                 </mwc-list-item>`
//             )}
//           </mwc-list>
//         </div>
//       </div>
//     </div>`;
//   }

//   render() {
//     if (!this._chessGameResults)
//       return html`<div class="container">
//         <mwc-circular-progress indeterminate></mwc-circular-progress>
//       </div>`;

//     const summary = this.getSummary();

//     return html`
//       <mwc-card style="flex: 1; min-width: 270px;">
//         <div class="column" style="margin: 16px; flex: 1;">
//           <span class="title">Game History</span>
//           ${this.renderResults()}
//           <div class="row center-content">
//             <span class="placeholder"
//               >Summary: ${summary.Won} ${summary.Won === 1 ? 'win' : 'wins'},
//               ${summary.Lost} ${summary.Lost === 1 ? 'loss' : 'losses'},
//               ${summary.Draw} ${summary.Draw === 1 ? 'draw' : 'draws'}</span
//             >
//           </div>
//         </div>
//       </mwc-card>
//     `;
//   }

//   getScopedElements() {
//     return {
//       'mwc-icon': Icon,
//       'mwc-card': Card,
//       'mwc-list': List,
//       'mwc-list-item': ListItem,
//     };
//   }

//   static styles = [sharedStyles];
// }
