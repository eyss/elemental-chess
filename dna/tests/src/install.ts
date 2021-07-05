import { InstalledHapp } from "@holochain/tryorama";
import path from "path";

export const MEM_PROOF1 = Buffer.from(
  "3gACrXNpZ25lZF9oZWFkZXLeAAKmaGVhZGVy3gACp2NvbnRlbnTeAAekdHlwZaZDcmVhdGWmYXV0aG9yxCeEICR/PJxdzJx345LodAe+FOB4NWOWQV0Tb5cfP5/8AL/nF6VBfU2pdGltZXN0YW1wks5gUzqazhJyV9WqaGVhZGVyX3NlcQmrcHJldl9oZWFkZXLEJ4QpJEIwak+vC8awMx0vdAe8XSbRRage/CuXmCjRhkkTtWWAUUOp8qplbnRyeV90eXBl3gABo0FwcN4AA6JpZACnem9tZV9pZACqdmlzaWJpbGl0ed4AAaZQdWJsaWPAqmVudHJ5X2hhc2jEJ4QhJAf4ZKktdaQZ6JJj4l+UDRCTwspZSchRPYXtwbdRVvyQBnB8ZqRoYXNoxCeEKSSebKOWLx1D9uHxPBkzVjOgm3gtO6w8VkiiEvigSfgTeFWLVN+pc2lnbmF0dXJlxEC+3INgyz2PfsiwtpBpTZIcx0JYVy9t7rYp2HWnK5x9Vw/uITWUzfIO4uaNl6MQppfkraxHLeNZqamjyEtRWggApWVudHJ53gABp1ByZXNlbnTeAAKqZW50cnlfdHlwZaNBcHClZW50cnnEMoKkcm9sZalkZXZlbG9wZXKucmVjb3JkX2xvY2F0b3Kybmljb2xhc0BsdWNrc3VzLmV1",
  "base64"
);
export const MEM_PROOF2= Buffer.from("3gACrXNpZ25lZF9oZWFkZXLeAAKmaGVhZGVy3gACp2NvbnRlbnTeAAekdHlwZaZDcmVhdGWmYXV0aG9yxCeEICR/PJxdzJx345LodAe+FOB4NWOWQV0Tb5cfP5/8AL/nF6VBfU2pdGltZXN0YW1wks5gcD4FzgasqzKqaGVhZGVyX3NlcQurcHJldl9oZWFkZXLEJ4QpJNtG6ACbdfDqI18OjkxChLZmpOSSWm8XJHXJIMWZfdtSEiHp7KplbnRyeV90eXBl3gABo0FwcN4AA6JpZACnem9tZV9pZACqdmlzaWJpbGl0ed4AAaZQdWJsaWPAqmVudHJ5X2hhc2jEJ4QhJHjY3eicfT1HbGb/UcqhzAwYyp6BfidKA08rs7hxC8Eusn7qB6RoYXNoxCeEKSRmBkijKK9gce6Ho8A8IltWJEwBrx8WBy7VF9gY4OWobvbYSvepc2lnbmF0dXJlxEA/wZ9KlDMdf8tXkz1gWnEfB8hEW5VBNZfHVYwyAFYqW2RWP+OKsF2784txDXzxSYbHFpbxvV41KYPwv8bto0gFpWVudHJ53gABp1ByZXNlbnTeAAKqZW50cnlfdHlwZaNBcHClZW50cnnELYKkcm9sZaVvdGhlcq5yZWNvcmRfbG9jYXRvcrFzaXIucm9iQGhvbG8uaG9zdA==", 'base64')

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
