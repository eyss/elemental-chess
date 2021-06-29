use hdk::prelude::*;
use holo_hash::{AgentPubKeyB64, EntryHashB64};
use holochain_turn_based_game::prelude::*;

pub mod chess_game;
pub mod chess_game_result;

use chess_game::{ChessGame, ChessGameMove, MakeMoveInput};

use chess_game_result::ChessGameResult;

entry_defs![
    GameMoveEntry::entry_def(),
    GameEntry::entry_def(),
    ChessGameResult::entry_def()
];

#[hdk_extern]
pub fn test(_: ()) -> ExternResult<()> {
    Ok(())
}

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    holochain_turn_based_game::prelude::init_turn_based_games()
}

#[hdk_extern]
pub fn create_game(opponent: AgentPubKeyB64) -> ExternResult<EntryHashB64> {
    holochain_turn_based_game::prelude::create_game(vec![
        opponent,
        AgentPubKeyB64::from(agent_info()?.agent_initial_pubkey),
    ])
}

#[hdk_extern]
pub fn make_move(input: MakeMoveInput) -> ExternResult<EntryHashB64> {
    holochain_turn_based_game::prelude::create_move(
        input.game_hash,
        input.previous_move_hash,
        input.game_move,
    )
}

#[hdk_extern]
pub fn get_game(game_hash: EntryHashB64) -> ExternResult<GameEntry> {
    holochain_turn_based_game::prelude::get_game(game_hash)
}

#[hdk_extern]
pub fn get_game_moves(game_hash: EntryHashB64) -> ExternResult<Vec<MoveInfo>> {
    holochain_turn_based_game::prelude::get_game_moves(game_hash)
}

#[hdk_extern]
pub fn publish_result(result: ChessGameResult) -> ExternResult<()> {
    chess_game_result::publish_result(result)
}

#[hdk_extern]
pub fn get_my_game_results(_: ()) -> ExternResult<Vec<(EntryHashB64, ChessGameResult)>> {
    chess_game_result::get_my_game_results()
}

#[hdk_extern]
fn validate_create_entry_game_entry(data: ValidateData) -> ExternResult<ValidateCallbackResult> {
    holochain_turn_based_game::prelude::validate_game_entry::<ChessGame, ChessGameMove>(data)
    // TODO: add validation for read-only agents
}
