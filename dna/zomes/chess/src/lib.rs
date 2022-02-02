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
    GameEntry::entry_def(),
    PathEntry::entry_def()
];

mixin_elo!(ChessEloRating);
mixin_turn_based_game!(ChessGame);

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    hc_mixin_elo::init_elo::<ChessEloRating>()?;
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
pub fn publish_result(result: PublishResultInput) -> ExternResult<EntryHashB64> {
    let opponent = get_opponent_for_game(result.game_hash.clone())?;

    let game_info = ChessGameInfo {
        last_game_move_hash: result.last_game_move_hash,
        game_hash: result.game_hash,
    };
    hc_mixin_elo::attempt_create_countersigned_game_result::<ChessEloRating>(
        game_info,
        opponent.clone(),
        result.my_score,
    )
}

#[hdk_extern]
pub fn publish_game_result_and_flag(result: PublishResultInput) -> ExternResult<EntryHashB64> {
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

    Ok(game_result_hash)
}

#[hdk_extern(infallible)]
fn post_commit(headers: Vec<SignedHeaderHashed>) {
    let result = post_commit_elo(headers.clone());

    let filter = ChainQueryFilter::new()
        .entry_type(GameResult::entry_type().unwrap())
        .include_entries(true);
    let elements = query(filter).unwrap();

    let header_hashes: Vec<HeaderHash> = headers
        .into_iter()
        .map(|shh| shh.header_address().clone())
        .collect();

    let newly_created_game_results_elements: Vec<Element> = elements
        .into_iter()
        .filter(|el| header_hashes.contains(el.header_address()))
        .collect();

    let new_game_results: Vec<CloseGameInput> = newly_created_game_results_elements
        .into_iter()
        .map(|el| {
            let (_, game_result) = element_to_game_result(el.clone()).unwrap();
            let entry_hash = el.header().entry_hash().unwrap();

            let info = ChessGameInfo::try_from(game_result.game_info).unwrap();

            CloseGameInput {
                game_hash: info.game_hash,
                game_result_hash: entry_hash.clone().into(),
            }
        })
        .collect();

    if new_game_results.len() > 0 {
        call_remote(
            agent_info().unwrap().agent_initial_pubkey,
            zome_info().unwrap().name,
            "close_games".into(),
            None,
            new_game_results,
        ).unwrap();
    }

    if let Err(err) = result {
        error!("Error executing the post_commit_elo function: {:?}", err);
    }
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

fn closing_game_result_tag() -> LinkTag {
    LinkTag::new("closing_game_result")
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CloseGameInput {
    game_hash: EntryHashB64,
    game_result_hash: EntryHashB64,
}

#[hdk_extern]
pub fn close_games(input: Vec<CloseGameInput>) -> ExternResult<()> {
    for i in input {
        hc_mixin_turn_based_game::remove_current_game(i.game_hash.clone().into())?;

        create_link(
            i.game_hash.into(),
            i.game_result_hash.into(),
            closing_game_result_tag(),
        )?;
    }

    Ok(())
}
