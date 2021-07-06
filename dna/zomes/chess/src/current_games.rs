use hdk::prelude::holo_hash::EntryHashB64;
use hdk::prelude::*;

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
    for agent in players {
        let link_to_current_game = get_current_games_for(agent)?
            .into_iter()
            .find(|link| link.target.eq(&game_hash));

        if let Some(link) = link_to_current_game {
            delete_link(link.create_link_hash)?;
        }
    }

    Ok(())
}

fn current_games_tag() -> LinkTag {
    LinkTag::new("current_games")
}

fn get_current_games_for(agent: AgentPubKey) -> ExternResult<Vec<Link>> {
    let links = get_links(agent.into(), Some(current_games_tag()))?;

    Ok(links.into_inner())
}
