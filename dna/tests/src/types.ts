import { InstallAgentsHapps } from "@holochain/tryorama";

export interface Installables {
  [key: string]: InstallAgentsHapps;
}

export type MakeMoveInput = {
  game_hash: string;
  previous_move_hash: string | null;
  game_move: any;
};
