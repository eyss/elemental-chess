use hdk::prelude::*;
use holochain_turn_based_game::prelude::*;

pub mod entries;
use entries::chess::chess_handlers;

use entries::chess::{ChessGameMove, MakeMoveInput, SurrenderInput};

entry_defs![GameMoveEntry::entry_def(), GameEntry::entry_def()];


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

// TESTING METHODS 
#[hdk_extern]
pub fn get_movement(_: ()) -> ExternResult<ChessGameMove> {
    let movement = ChessGameMove::PlacePiece {
        from: String::from("Movimiento"),
        to: String::from("Movimiento_2"),
    };
    Ok(movement)
}
