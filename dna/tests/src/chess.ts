import { ScenarioApi } from "@holochain/tryorama/lib/api";
import { Orchestrator } from "@holochain/tryorama";
import {
  config,
  installAgents,
  MEM_PROOF1,
  MEM_PROOF2,
  MEM_PROOF_READ_ONLY,
} from "./install";
import { createGame, delay, getCurrentGames, getGameResultsForAgents, makeMove, serializeHash } from "./utils";
import { MakeMoveInput } from "./types";

//const getMovement = (conductor) =>  conductor.call("chess", "get_movement",);

export default function (orchestrator: Orchestrator<any>) {
  orchestrator.registerScenario(
    "chess zome tests",
    async (s: ScenarioApi, t) => {
      const [conductor] = await s.players([config]);

      conductor.setSignalHandler((signal) => {
        console.log("Player has received Signal:", signal.data.payload.payload);
      });

      const [alice_happ, bobby_happ] = await installAgents(
        conductor,
        ["alice", "bob"],
        [MEM_PROOF1, MEM_PROOF2]
      );

      const alicePubKey = serializeHash(alice_happ.agent);
      const bobbyPubKey = serializeHash(bobby_happ.agent);

      const alice_conductor = alice_happ.cells[0];
      const bobby_conductor = bobby_happ.cells[0];
      await bobby_conductor.call("profiles", "get_my_profile", null);

      await delay(3000);
      const new_game_address: string = await createGame(bobbyPubKey)(
        alice_conductor
      );
      await delay(4000);

      console.log("the result is this:");
      console.log(new_game_address);

      const movement_input: MakeMoveInput = {
        game_hash: new_game_address,
        previous_move_hash: null,
        game_move: { type: "PlacePiece", from: "e2", to: "e4" },
      };

      let lastMoveHash = await makeMove(movement_input)(bobby_conductor);
      await delay(4000);

      const links = await alice_conductor.call(
        "chess",
        "get_game_moves",
        new_game_address
      );

      t.equal(links.length, 1);

      const aliceCurrentGames = await getCurrentGames()(alice_conductor);
      t.equal(Object.keys(aliceCurrentGames).length, 1);
      const aliceGamesResults = await getGameResultsForAgents(alice_conductor)([
        alicePubKey,
      ]);
      t.equal(aliceGamesResults[alicePubKey].length, 0);

      const bobCurrentGames = await getCurrentGames()(bobby_conductor);
      t.equal(Object.keys(bobCurrentGames).length, 1);
      const bobGamesResults = await getGameResultsForAgents(bobby_conductor)([
        bobbyPubKey,
      ]);
      t.equal(bobGamesResults[bobbyPubKey].length, 0);

      const resign_move: MakeMoveInput = {
        game_hash: new_game_address,
        previous_move_hash: lastMoveHash,
        game_move: { type: "Resign" },
      };
      lastMoveHash = await makeMove(resign_move)(alice_conductor);
      await delay(3000);
      const game_result_hash = await alice_conductor.call("chess", "publish_result", {
        game_hash: new_game_address,
        last_game_move_hash: lastMoveHash,
        my_score: 0,
      });
      t.ok(game_result_hash);

      await delay(3000);

      const aliceCurrentGames1 = await getCurrentGames()(alice_conductor);
      console.log(aliceCurrentGames1);
      t.equal(Object.keys(aliceCurrentGames1).length, 0);
      const aliceGamesResults1 = await getGameResultsForAgents(alice_conductor)(
        [alicePubKey]
      );
      t.equal(aliceGamesResults1[alicePubKey].length, 1);
      console.log("test 8, alices game results",aliceGamesResults1[alicePubKey])

      const bobCurrentGames1 = await getCurrentGames()(bobby_conductor);
      t.equal(Object.keys(bobCurrentGames1).length, 0);
      console.log("finished test 9, bobs current games zero",bobCurrentGames1)

      const bobGamesResults1 = await getGameResultsForAgents(bobby_conductor)(
        [bobbyPubKey]
      );
      console.log("test 10, bobs game results",bobGamesResults1)

      t.equal(bobGamesResults1[bobbyPubKey].length, 1);
    }
  );
}
