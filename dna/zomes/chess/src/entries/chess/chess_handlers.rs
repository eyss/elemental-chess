use hdk::prelude::*;
use holo_hash::{AgentPubKeyB64, EntryHashB64};

use super::{ChessGame, ChessGameMove};

pub fn create_game(opponent: AgentPubKeyB64) -> ExternResult<EntryHashB64> {
    holochain_turn_based_game::prelude::create_game(vec![
        opponent,
        agent_info()?.agent_initial_pubkey.into(),
    ])
}

pub fn make_move(
    game_address: EntryHashB64,
    prev_movement: Option<EntryHashB64>,
    game_move: ChessGameMove,
) -> ExternResult<EntryHashB64> {
    holochain_turn_based_game::prelude::create_move(game_address, prev_movement, game_move)
}

pub fn get_game_info(
    game_address: EntryHashB64,
) -> ExternResult<GameInfo<ChessGame, ChessGameMove>> {
    holochain_turn_based_game::prelude::get_game_info(game_address)
}

// fn get_my_games() -> ZomeApiResult<Vec<Address>> {
//     holochain_turn_based_game::get_agent_games(agent_info()?.agent_latest_pubkey)
// }

// fn get_entry(entry_address: Address) -> ZomeApiResult<Option<Entry>> {
//     hdk::get_entry(&entry_address)
// }
