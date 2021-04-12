import { ScenarioApi } from "@holochain/tryorama/lib/api";
import { Orchestrator } from "@holochain/tryorama";


export function ChessZomeTest(config, installables){

    let orchestrator = new Orchestrator();

    orchestrator.registerScenario("chess zome tests", async (s:ScenarioApi, t) =>{

        console.log("Hello World");
        
    });

    orchestrator.run();
}

