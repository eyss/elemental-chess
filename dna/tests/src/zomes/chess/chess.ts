import { ScenarioApi } from "@holochain/tryorama/lib/api";
import { Orchestrator } from "@holochain/tryorama";
import { Conductor } from "@holochain/tryorama/lib/conductor";




const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const createGame = (players: Buffer[]) =>  (conductor) =>  conductor.call("chess", "create_game", players);
const makeMove = (make_move_input:makeMoveInput) =>  (conductor) => conductor.call("chess", "make_move", make_move_input); 
const getMovement = (conductor) =>  conductor.call("chess", "get_movement",);

type makeMoveInput = {
    game_address:Buffer,
    prev_movement:any, // there is a better way to represent options in typescript ??
    game_move: any
}
    

export function ChessZomeTest(config, installables) {

    let orchestrator = new Orchestrator();

    orchestrator.registerScenario("chess zome tests", async (s: ScenarioApi, t) => {

        const [alice, bobby] = await s.players([config, config]);

        const [[alice_happ]] = await alice.installAgentsHapps(installables.one);
        const [[bobby_happ]] = await bobby.installAgentsHapps(installables.one);

        const alicePubKey = alice_happ.agent;
        const bobbyPubKey = bobby_happ.agent;

        const alice_conductor = alice_happ.cells[0];
        const bobby_conductor = bobby_happ.cells[0];

        let alice_flag:Boolean = false;
        let bobby_flag:Boolean = false;


        alice.setSignalHandler((signal) => {

            alice_flag!=alice_flag;
            console.log("Hola alice:",signal)
        })

        bobby.setSignalHandler((signal) => {
            
            bobby_flag!=bobby_flag;
            console.log("Hola bobby:",signal)
        });


        const get_movement = await getMovement(alice_conductor);
        await delay(1000);

        const new_game_address:Buffer = await createGame([alicePubKey, bobbyPubKey])(alice_conductor);
        await delay(1000);

        const movement_input: makeMoveInput = {
            game_address: new_game_address,
            prev_movement: null,
            game_move: {PlacePiece: { from: "Movimiento", to: "Movimiento_2"}}
        };       

        const make_move = await makeMove(movement_input)(alice_conductor);
        await delay(1000);



        console.log("Hello World");
        console.log(new_game_address);
        console.log(get_movement);
        console.log(make_move);
        console.log(alice_flag);
        console.log(bobby_flag);


    

    });

    orchestrator.run();
}

