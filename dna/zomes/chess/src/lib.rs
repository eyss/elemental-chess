use hdk::prelude::*;
use holo_hash::{AgentPubKeyB64, EntryHashB64};
use holochain_turn_based_game::prelude::*;

pub mod entries;
use entries::chess::{chess_handlers, ChessGame};

use entries::chess::{ChessGameMove, MakeMoveInput};

entry_defs![GameMoveEntry::entry_def(), GameEntry::entry_def()];

#[hdk_extern]
pub fn create_game(opponent: AgentPubKeyB64) -> ExternResult<EntryHashB64> {
    return chess_handlers::create_game(opponent.into());
}

#[hdk_extern]
pub fn make_move(input: MakeMoveInput) -> ExternResult<EntryHashB64> {
    return chess_handlers::make_move(input.game_hash, input.prev_movement, input.game_move);
}

#[hdk_extern]
pub fn get_game_info(game_address: EntryHash) -> ExternResult<ChessGame> {
    return chess_handlers::get_game_info(game_address);
}
