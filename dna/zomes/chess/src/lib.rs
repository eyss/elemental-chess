use hdk::prelude::*;
use holochain_turn_based_game::prelude::*;

pub mod entries;
use entries::chess::chess_handlers;
use entries::invitation::Invitation;

use entries::chess::{MakeMoveInput, SurrenderInput};

entry_defs![GameMoveEntry::entry_def(), GameEntry::entry_def()];

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    Ok(InitCallbackResult::Pass)
}

#[hdk_extern]
pub fn create_game(players: Vec<AgentPubKey>) -> ExternResult<EntryHash> {
    return chess_handlers::create_game(players);
}

#[hdk_extern]
pub fn make_move(input: MakeMoveInput) -> ExternResult<EntryHash> {
    return chess_handlers::make_move(input.game_address, input.prev_movement, input.game_move);
}

#[hdk_extern]
pub fn surrender(input: SurrenderInput) -> ExternResult<EntryHash> {
    return chess_handlers::surrender(input.game_address, input.prev_movement);
}

#[hdk_extern]
pub fn get_game_state(game_address: EntryHash) -> ExternResult<String> {
    return chess_handlers::get_game_state(game_address);
}

#[hdk_extern]
pub fn get_game_moves(game_address: EntryHash) -> ExternResult<Vec<String>> {
    return chess_handlers::get_game_moves(game_address);
}

#[hdk_extern]
pub fn get_received_invitations(_: ()) -> ExternResult<Vec<Invitation>> {
    return chess_handlers::get_received_invitations();
}

#[hdk_extern]
pub fn reject_invitation(invitation: Invitation) -> ExternResult<bool> {
    return chess_handlers::reject_invitation(invitation);
}

#[hdk_extern]
pub fn accept_invitation(invitation: Invitation) -> ExternResult<bool> {
    return chess_handlers::accept_invitation(invitation);
}
