import { InstalledHapp } from "@holochain/tryorama";
import path from "path";

export const MEM_PROOF1 = Buffer.from(
  "3gACrXNpZ25lZF9oZWFkZXLeAAKmaGVhZGVy3gACp2NvbnRlbnTeAAekdHlwZaZDcmVhdGWmYXV0aG9yxCeEICREcSxdIB5vMom0+wtjVdw148AUiJ4UG3PYBNqeWiTGdILUqTOpdGltZXN0YW1wks5gweIkzivzEHGqaGVhZGVyX3Nlcc0BMKtwcmV2X2hlYWRlcsQnhCkks5/HpSpAL3RXYHfpjhAk8ZXayukBa4/54aur1mBaKL95vbeDqmVudHJ5X3R5cGXeAAGjQXBw3gADomlkAKd6b21lX2lkAKp2aXNpYmlsaXR53gABplB1YmxpY8CqZW50cnlfaGFzaMQnhCEkyy3pfmVBc8BkzVX5+jlnJ3TBYFrrdIdGdEMz0170ZSUTdfg9pGhhc2jEJ4QpJI+UES7dIWlQ0LcaXyirSViVBv7mCZr8GbZKBXZ7GxxR5WFvyKlzaWduYXR1cmXEQLpug6Zw3jDRuqiykCLCHrrD6q0XNxXPYe/Nq/Ec4YXY9Q3ISu9HuCC4qnAhAAOY8fcRNBIfe2WSmYfv1b2ViQalZW50cnneAAGnUHJlc2VudN4AAqplbnRyeV90eXBlo0FwcKVlbnRyecQngqRyb2xlpUFETUlOrnJlY29yZF9sb2NhdG9yqzBAaG9sby5ob3N0",
  "base64"
);
export const MEM_PROOF2= Buffer.from("3gACrXNpZ25lZF9oZWFkZXLeAAKmaGVhZGVy3gACp2NvbnRlbnTeAAekdHlwZaZDcmVhdGWmYXV0aG9yxCeEICREcSxdIB5vMom0+wtjVdw148AUiJ4UG3PYBNqeWiTGdILUqTOpdGltZXN0YW1wks5gweIkzixIo3KqaGVhZGVyX3Nlcc0BMatwcmV2X2hlYWRlcsQnhCkkj5QRLt0haVDQtxpfKKtJWJUG/uYJmvwZtkoFdnsbHFHlYW/IqmVudHJ5X3R5cGXeAAGjQXBw3gADomlkAKd6b21lX2lkAKp2aXNpYmlsaXR53gABplB1YmxpY8CqZW50cnlfaGFzaMQnhCEkcnWUeAP9pcKJDhZ4o4O90LrmS18D+GEzbW+NDjO8Z0wf3/T9pGhhc2jEJ4QpJEtzArTCIZZC+l/TQktzXOl+xrmogg1nMIB3Ft5NjnxRZhC//KlzaWduYXR1cmXEQEAf7f2MAkMgXiD266vMoLihO0nrUSpUQIsnu8v7nZkec7OnDOQ639H6f0MfrGH3kpNetQ4j6YH1QE7X2RLrLgKlZW50cnneAAGnUHJlc2VudN4AAqplbnRyeV90eXBlo0FwcKVlbnRyecQngqRyb2xlpUFETUlOrnJlY29yZF9sb2NhdG9yqzFAaG9sby5ob3N0", 'base64')

export const MEM_PROOF_READ_ONLY = Buffer.from([0]);

const chessDna = path.join("../workdir/dna/elemental-chess.dna");

export const installAgents = async (
  conductor,
  agentNames: string[],
  memProofArray?,
  holo_agent_override?
) => {
  const admin = conductor.adminWs();
  const dnaHash = await conductor.registerDna(
    { path: chessDna },
    conductor.scenarioUID,
    { skip_proof: !memProofArray, holo_agent_override }
  );

  const agents: Array<InstalledHapp> = await Promise.all(
    agentNames.map(async (agent, i) => {
      console.log(`generating key for: ${agent}:`);
      const agent_key = await admin.generateAgentPubKey();
      console.log(`${agent} pubkey:`, agent_key.toString("base64"));

      let dna = {
        hash: dnaHash,
        nick: "elemental-chat",
      };
      if (memProofArray) {
        dna["membrane_proof"] = Array.from(memProofArray[i]);
      }

      const req = {
        installed_app_id: `${agent}_chat`,
        agent_key,
        dnas: [dna],
      };
      console.log(`installing happ for: ${agent}`);
      return await conductor._installHapp(req);
    })
  );
  return agents;
};
