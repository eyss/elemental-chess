import Base64 from "js-base64";
import { MakeMoveInput } from "./types";

export const delay = (ms) => new Promise((r) => setTimeout(r, ms));
export const createGame = (opponent: string) => (conductor) =>
  conductor.call("chess", "create_game", opponent);
export const makeMove = (make_move_input: MakeMoveInput) => (conductor) =>
  conductor.call("chess", "make_move", make_move_input);
export const getCurrentGames = () => (conductor) =>
  conductor.call("chess", "get_my_current_games", null);
export const getGameResultsForAgents = (conductor) => (agents) =>
  conductor.call("chess", "get_game_results_for_agents", agents);

export function serializeHash(hash) {
  return `u${Base64.fromUint8Array(hash, true)}`;
}
