import {
  Config,
  NetworkType,
  Orchestrator,
  TransportConfigType,
} from "@holochain/tryorama";

import chess from "./chess";
import moves from "./moves";

let orchestrator = new Orchestrator();
chess(orchestrator);
orchestrator.run();

orchestrator = new Orchestrator();
moves(orchestrator);
orchestrator.run();
