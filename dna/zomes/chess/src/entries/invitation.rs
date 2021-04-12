use hdk::prelude::*;

#[derive(Clone, Debug)]
pub struct Invitation {
    pub inviter: AgentPubKey,
    pub invited: AgentPubKey,
    pub status: String,
    pub timestamp: u64, // this field can be removed at this holochain version
}