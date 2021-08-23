use hdk::prelude::holo_hash::EntryHashB64;
use hdk::prelude::*;

use crate::chess_game_result::game_result_tag;

pub fn get_my_current_games() -> ExternResult<Vec<EntryHashB64>> {
    let links = get_current_games_for(agent_info()?.agent_initial_pubkey)?;

    Ok(links
        .into_iter()
        .map(|l| EntryHashB64::from(l.target))
        .collect())
}

pub fn add_current_game(game_hash: EntryHash, players: Vec<AgentPubKey>) -> ExternResult<()> {
    for agent in players {
        create_link(agent.into(), game_hash.clone().into(), current_games_tag())?;
    }

    Ok(())
}

pub fn remove_current_game(game_hash: EntryHash, players: Vec<AgentPubKey>) -> ExternResult<()> {
    warn!("Removing current game for {:?}", players);
    for agent in players {
        let link_to_current_game = get_current_games_for(agent.clone())?
            .into_iter()
            .find(|link| link.target.eq(&game_hash));

        if let Some(link) = link_to_current_game {
            warn!("Current game for {} {}", agent, link.create_link_hash);
            delete_link(link.create_link_hash)?;
        }
    }

    Ok(())
}

fn current_games_tag() -> LinkTag {
    LinkTag::new("current_games")
}

fn get_current_games_for(agent: AgentPubKey) -> ExternResult<Vec<Link>> {
    let links = get_links(agent.clone().into(), Some(current_games_tag()))?;
    warn!("Current games for {} {:?}", agent, links);

    let current_games = links
        .into_inner()
        .into_iter()
        .filter(|link| {
            let links_result = get_links(link.target.clone(), Some(game_result_tag()));
            match links_result {
                Ok(links) => match links.into_inner().len() {
                    0 => true,
                    _ => false,
                },
                Err(_) => false,
            }
        })
        .collect();

    Ok(current_games)
}
