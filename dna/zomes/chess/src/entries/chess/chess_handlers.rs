use hdk::prelude::*;

use super::{ChessGame, ChessGameMove};

pub fn create_game(players: Vec<AgentPubKey>) -> ExternResult<EntryHash> {
    holochain_turn_based_game::prelude::create_game(players)
}
pub fn make_move(
    game_address: EntryHash,
    prev_movement: Option<EntryHash>,
    game_move: ChessGameMove,
) -> ExternResult<EntryHash> {
    holochain_turn_based_game::prelude::create_move(game_address, prev_movement, game_move)
}

pub fn surrender(game_address: EntryHash, prev_mov: Option<EntryHash>) -> ExternResult<EntryHash> {
    let game_mov = ChessGameMove::Resign;
    holochain_turn_based_game::prelude::create_move(game_address, prev_mov, game_mov)
}

pub fn get_game_state(game_address: EntryHash) -> ExternResult<String> {
    let chess_game_state: ChessGame =
    holochain_turn_based_game::prelude::get_game_state(game_address)?;
    Ok(chess_game_state.into())
}

pub fn get_game_moves(game_address: EntryHash) -> ExternResult<Vec<String>> {
    let moves: Vec<ChessGameMove> =
        holochain_turn_based_game::prelude::get_game_moves(game_address)?;
    Ok(moves.into_iter().map(|m| m.into()).collect())
}


// fn get_my_games() -> ZomeApiResult<Vec<Address>> {
//     holochain_turn_based_game::get_agent_games(agent_info()?.agent_latest_pubkey)
// }

// fn get_entry(entry_address: Address) -> ZomeApiResult<Option<Entry>> {
//     hdk::get_entry(&entry_address)
// }

