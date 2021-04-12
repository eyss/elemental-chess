use hdk::prelude::*;

#[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
pub struct Invitation {
    pub inviter: AgentPubKey,
    pub invited: AgentPubKey,
    pub status: String,
    pub timestamp: u64, // this field can be removed at this holochain version
}

entry_def!(Invitation
    EntryDef{
        id: "invitation".into(),
        visibility: EntryVisibility::Public,
        crdt_type: CrdtType,
        required_validations: RequiredValidations::default(),
        required_validation_type: RequiredValidationType::Element
    }
);