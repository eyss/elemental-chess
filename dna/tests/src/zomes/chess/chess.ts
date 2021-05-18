import { ScenarioApi } from "@holochain/tryorama/lib/api";
import { Orchestrator } from "@holochain/tryorama";
import { Conductor } from "@holochain/tryorama/lib/conductor";
import Base64 from "js-base64";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const createGame = (opponent: string) => (conductor) =>
  conductor.call("chess", "create_game", opponent);
const makeMove = (make_move_input: MakeMoveInput) => (conductor) =>
  conductor.call("chess", "make_move", make_move_input);
//const getMovement = (conductor) =>  conductor.call("chess", "get_movement",);

type MakeMoveInput = {
  game_hash: string;
  previous_move_hash: string | undefined;
  game_move: any;
};

function serializeHash(hash) {
  return `u${Base64.fromUint8Array(hash, true)}`;
}

export function ChessZomeTest(config, installables) {
  let orchestrator = new Orchestrator();

  orchestrator.registerScenario(
    "chess zome tests",
    async (s: ScenarioApi, t) => {
      const [alice, bobby] = await s.players([config, config]);

      const [[alice_happ]] = await alice.installAgentsHapps(installables.one);
      const [[bobby_happ]] = await bobby.installAgentsHapps(installables.one);

      const alicePubKey = serializeHash(alice_happ.agent);
      const bobbyPubKey = serializeHash(bobby_happ.agent);

      const alice_conductor = alice_happ.cells[0];
      const bobby_conductor = bobby_happ.cells[0];

      let alice_flag: Boolean = false;
      let bobby_flag: Boolean = false;

      alice.setSignalHandler((signal) => {
        alice_flag != alice_flag;
        console.log("Hola alice:", signal);
      });

      bobby.setSignalHandler((signal) => {
        bobby_flag != bobby_flag;
        console.log("Hola bobby:", signal);
      });

      const new_game_address: string = await createGame(bobbyPubKey)(
        alice_conductor
      );
      await delay(1000);
      const movement_input: MakeMoveInput = {
        game_hash: new_game_address,
        previous_move_hash: undefined,
        game_move: { type: "PlacePiece", from: "e2", to: "e4" },
      };

      const make_move = await makeMove(movement_input)(bobby_conductor);
      await delay(1000);

      await delay(10000);
      const links = await alice_conductor.call(
        "chess",
        "get_game_moves",
        new_game_address
      );

      t.equal(links.length, 1);
    }
  );

  orchestrator.run();
}
