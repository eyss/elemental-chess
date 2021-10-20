use elo::{ChessEloRating, ChessGameInfo};
use hc_mixin_elo::*;
use hc_mixin_turn_based_game::*;
use hdk::prelude::holo_hash::{AgentPubKeyB64, EntryHashB64};
use hdk::prelude::*;

pub mod chess_game;
pub mod elo;

use chess_game::ChessGame;

entry_defs![
    hc_mixin_elo::GameResult::entry_def(),
    GameMoveEntry::entry_def(),
    GameEntry::entry_def()
];

mixin_elo!(ChessEloRating);
mixin_turn_based_game!(ChessGame);

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    hc_mixin_elo::init_elo()?;
    hc_mixin_turn_based_game::init_turn_based_games()
}

#[hdk_extern]
pub fn create_game(opponent: AgentPubKeyB64) -> ExternResult<EntryHashB64> {
    let my_pub_key = agent_info()?.agent_initial_pubkey;
    let players = vec![opponent.clone(), AgentPubKeyB64::from(my_pub_key.clone())];

    let game_hash = hc_mixin_turn_based_game::create_game(players.clone())?;

    Ok(game_hash)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PublishResultInput {
    game_hash: EntryHashB64,
    last_game_move_hash: HeaderHashB64,
    my_score: f32,
}

#[hdk_extern]
pub fn publish_result(result: PublishResultInput) -> ExternResult<CreateGameResultOutcome> {
    let opponent = get_opponent_for_game(result.game_hash.clone())?;

    let game_info = ChessGameInfo {
        last_game_move_hash: result.last_game_move_hash,
        game_hash: result.game_hash.clone(),
    };
    let outcome = hc_mixin_elo::attempt_create_countersigned_game_result::<ChessEloRating>(
        game_info,
        opponent.clone(),
        result.my_score,
    )?;

    Ok(outcome)
}

#[hdk_extern]
pub fn publish_game_result_and_flag(result: PublishResultInput) -> ExternResult<()> {
    let game_info = ChessGameInfo {
        last_game_move_hash: result.last_game_move_hash,
        game_hash: result.game_hash.clone(),
    };
    let opponent = get_opponent_for_game(result.game_hash.clone())?;

    let game_result_hash = create_game_result_and_flag::<ChessEloRating>(
        game_info,
        opponent.clone(),
        result.my_score,
    )?;

    finish_game(FinishGameInput {
        game_hash: result.game_hash.into(),
        game_result_hash: game_result_hash.into(),
    })?;

    Ok(())
}

#[hdk_extern]
fn post_commit(header_hashes: HeaderHashes) -> ExternResult<PostCommitCallbackResult> {
    post_commit_elo(header_hashes.0)?;

    Ok(PostCommitCallbackResult::Success)
}

fn get_opponent_for_game(game_hash: EntryHashB64) -> ExternResult<AgentPubKeyB64> {
    let game = get_game(game_hash)?;
    let my_pub_key = agent_info()?.agent_latest_pubkey;

    game.players
        .into_iter()
        .find(|p| !AgentPubKey::from(p.clone()).eq(&my_pub_key))
        .ok_or(WasmError::Guest(
            "I don't have any opponents in this game".into(),
        ))
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FinishGameInput {
    game_hash: EntryHashB64,
    game_result_hash: EntryHashB64,
}

#[hdk_extern]
pub fn finish_game_and_link(input: FinishGameInput) -> ExternResult<()> {
    link_my_game_results(vec![input.game_result_hash.clone()])?;

    finish_game(input)
}

fn game_result_tag() -> LinkTag {
    LinkTag::new("closing_game_result")
}

pub fn finish_game(input: FinishGameInput) -> ExternResult<()> {
    let opponent = get_opponent_for_game(input.game_hash.clone())?;
    let players: Vec<AgentPubKey> = vec![opponent.into(), agent_info()?.agent_latest_pubkey];

    hc_mixin_turn_based_game::remove_current_game(input.game_hash.clone().into(), players.clone())?;

    create_link(
        input.game_hash.into(),
        input.game_result_hash.into(),
        game_result_tag(),
    )?;

    Ok(())
}
