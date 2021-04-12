use hdk::prelude::*;

use super::{ChessGame, ChessGameMove};
use crate::entries::invitation::Invitation;

pub fn create_game(players: Vec<AgentPubKey>) -> ExternResult<EntryHash> {
    holochain_turn_based_game::prelude::create_game(players)
}
pub fn make_move(
    game_address: EntryHash,
    prev_movement: Option<EntryHash>,
    game_mov: ChessGameMove,
) -> ExternResult<EntryHash> {
    holochain_turn_based_game::prelude::create_move(game_address, prev_movement, game_mov)
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

pub fn invite_user(opponent: AgentPubKey, timestamp: u64) -> ExternResult<bool> {
    let agent_pub_key: AgentPubKey = agent_info()?.agent_latest_pubkey;
    let invitation = Invitation {
        invited: opponent.clone(),
        inviter: agent_pub_key.clone(),
        status: String::from("Pending"),
        timestamp,
    };
    let invitation_entry_hash: EntryHash = hash_entry(&invitation)?;
    create_entry(&invitation)?;

    create_link(
        agent_pub_key.into(),
        invitation_entry_hash.clone(),
        LinkTag::new(String::from("Inviter")),
    )?;

    create_link(
        opponent.into(),
        invitation_entry_hash.clone(),
        LinkTag::new(String::from("Invited")),
    )?;

    Ok(true)
}

pub fn get_sent_invitations() -> ExternResult<Vec<Invitation>> {
    let agent_pub_key: AgentPubKey = agent_info()?.agent_latest_pubkey;

    let sended_invitations_links: Vec<Link> = get_links(
        agent_pub_key.into(),
        Some(LinkTag::new(String::from("Inviter"))),
    )?
    .into_inner();

    get_invitations_entries_from_links(sended_invitations_links)
}

pub fn get_received_invitations() -> ExternResult<Vec<Invitation>> {
    let agent_pub_key: AgentPubKey = agent_info()?.agent_latest_pubkey;

    let sended_invitations_links: Vec<Link> = get_links(
        agent_pub_key.into(),
        Some(LinkTag::new(String::from("Invited"))),
    )?
    .into_inner();

    get_invitations_entries_from_links(sended_invitations_links)
}

pub fn reject_invitation(invitation: Invitation) -> ExternResult<bool> {
    let invitation_entry_hash: EntryHash = hash_entry(&invitation)?;

    match get(invitation_entry_hash, GetOptions::content())? {
        Some(element) => {
            let invitation_header_hash: HeaderHash = element.header_address().to_owned();
            let updated_invitation: Invitation = Invitation {
                status: String::from("rejected"),
                ..invitation
            };

            update_entry(invitation_header_hash, updated_invitation)?;
        }

        None => {
            error("we dont found the invitation entry you give us")?;
        }
    }

    Ok(true)
}

pub fn accept_invitation(invitation: Invitation) -> ExternResult<bool> {
    let invitation_entry_hash: EntryHash = hash_entry(&invitation)?;

    match get(invitation_entry_hash, GetOptions::content())? {
        Some(element) => {
            let invitation_header_hash: HeaderHash = element.header_address().to_owned();
            let updated_invitation: Invitation = Invitation {
                status: String::from("acepted"),
                ..invitation.clone()
            };
            let agent_pub_key: AgentPubKey = agent_info()?.agent_latest_pubkey;

            update_entry(invitation_header_hash, updated_invitation)?;
            create_game(vec![agent_pub_key, invitation.inviter])?;
        }

        None => {
            error("we dont found the invitation entry you give us")?;
        }
    }

    Ok(true)
}

//HELPERS 
fn get_invitations_entries_from_links(links: Vec<Link>) -> ExternResult<Vec<Invitation>> {
    let mut invitations: Vec<Invitation> = vec![];

    for link in links.iter() {
        match get(link.target.clone(), GetOptions::content())? {
            Some(element) => match element.entry().to_app_option::<Invitation>()? {
                Some(invitation) => {
                    invitations.push(invitation);
                }
                None => {}
            },

            None => {}
        };
    }

    Ok(invitations)
}

fn error(msg: &str) -> ExternResult<()> {
    return Err(WasmError::Guest(String::from(msg)));
}




// fn get_my_games() -> ZomeApiResult<Vec<Address>> {
//     holochain_turn_based_game::get_agent_games(agent_info()?.agent_latest_pubkey)
// }

// fn get_entry(entry_address: Address) -> ZomeApiResult<Option<Entry>> {
//     hdk::get_entry(&entry_address)
// }

// #[receive]
// fn receive(sender_address: Address, message: String) -> String {
//     let result = holochain_turn_based_game::handle_receive_move(sender_address, message);

//     JsonString::from(result).to_string()
// }
