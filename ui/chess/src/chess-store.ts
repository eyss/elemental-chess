import { EloService, EloStore } from '@eyss/elo';
import {
  MoveInfo,
  TurnBasedGameService,
  TurnBasedGameStore,
} from '@eyss/turn-based-game';
import { CellClient } from '@holochain-open-dev/cell-client';
import {
  AgentPubKeyB64,
  EntryHashB64,
  HeaderHashB64,
} from '@holochain-open-dev/core-types';
import { ProfilesStore } from '@holochain-open-dev/profiles';
import { PeerStatusStore } from '@holochain-open-dev/peer-status';
import { get } from 'svelte/store';
import { ChessService } from './chess-service';
import { ChessMove } from './types';

export class ChessStore {
  public profilesStore: ProfilesStore;
  public turnBasedGameStore: TurnBasedGameStore<ChessMove>;
  public eloStore: EloStore;
  public peerStatusStore: PeerStatusStore
  public service: ChessService;

  constructor(
    protected cellClient: CellClient,
    protected zomeName: string = 'chess'
  ) {
    this.service = new ChessService(cellClient, zomeName);
    this.profilesStore = new ProfilesStore(cellClient);
    this.turnBasedGameStore = new TurnBasedGameStore(
      new TurnBasedGameService(cellClient, zomeName),
      this.profilesStore
    );
    this.eloStore = new EloStore(
      new EloService(cellClient, zomeName),
      this.profilesStore
    );
    this.peerStatusStore = new PeerStatusStore(cellClient)
  }

  public async createGame(opponent: AgentPubKeyB64): Promise<EntryHashB64> {
    return this.service.createGame(opponent);
  }

  public async fetchGameDetails(gameHash: EntryHashB64) {
    await this.turnBasedGameStore.fetchGame(gameHash);
    // Fetch moves needs the game already fetched
    await this.turnBasedGameStore.fetchGameMoves(gameHash);

    const game = get(this.turnBasedGameStore.game(gameHash));

    const players = game.entry.players;

    await Promise.all([
      this.eloStore.fetchEloForAgents(players),
      this.profilesStore.fetchAgentsProfiles(players),
    ]);
    
  }

  public async publishResult(
    gameHash: EntryHashB64,
    lastGameMoveHash: HeaderHashB64,
    myScore: 1.0 | 0.5 | 0.0
  ): Promise<void> {
    try {
      await sleep(500);
      await this.service.publishResult(
        gameHash,
        lastGameMoveHash,
        myScore
      );
    } catch (e) {
      if (JSON.stringify(e).includes('Failed to get Element')) {
        // The opponent can't get our last move yet, sleep and retry
        await sleep(2000);
        return this.publishResult(gameHash, lastGameMoveHash, myScore);
      }
      console.warn('Error publishing a countersigned result, most likely the opponent is not online. Create a unilateral one.',e);

      await this.service.publishGameResultAndFlag(
        gameHash,
        lastGameMoveHash,
        myScore
      );
    }
  }


  public checkForMovesOnTimeout(move_header_hash:string, all_game_moves:MoveInfo<ChessMove>[], gameHash:string) {
    setTimeout(async()=>{ 
      if (all_game_moves.at(all_game_moves.length - 1)?.header_hash === move_header_hash){
        console.info("checking for a new move")
        await this.turnBasedGameStore.fetchGameMoves(gameHash)
      }
    },60000)
  }

}

export const sleep = (ms: number) =>
  new Promise(r => setTimeout(() => r(null), ms));
