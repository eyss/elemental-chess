import {
  Config,
  NetworkType,
  InstallAgentsHapps,
  TransportConfigType,
} from "@holochain/tryorama";

import { Installables } from "./types";
import path from "path";
import chess from "./zomes/chess";

// QUIC
const network = {
  network_type: NetworkType.QuicBootstrap,
  transport_pool: [{type: TransportConfigType.Quic}],
  bootstrap_service: "https://bootstrap-staging.holo.host/",
};

const config = Config.gen({network});

const scores_zome = path.join("../workdir/dna/HoloChess.dna");

const installAgent: InstallAgentsHapps = [[[scores_zome]]];

const install2Agents: InstallAgentsHapps = [[[scores_zome]], [[scores_zome]]];

const install3Agents: InstallAgentsHapps = [[[scores_zome]], [[scores_zome]], [[scores_zome]]];

const installables: Installables = {
  one: installAgent,
  two: install2Agents,
  three: install3Agents,
};


chess( config, installables);

