use hdk::prelude::*;
use std::str::FromStr;
use holochain_turn_based_game::prelude::TurnBasedGame;
use chess::{ChessMove, Color, Game, GameResult, Square};


#[derive(Clone, Debug)]
pub struct ChessGame {
    pub white_address: AgentPubKey,
    pub black_address: AgentPubKey,
    pub game:Game,
}

impl Into<String> for ChessGame {
    fn into(self) -> String {
        format!("{}", self.game.current_position())
    }
}

#[derive(Clone, SerializedBytes, Deserialize, Serialize, Debug)]

pub enum ChessGameMove {
    PlacePiece { from: String, to: String },
    Resign,
}

impl Into<String> for ChessGameMove {
    fn into(self) -> String {
        match self {
            ChessGameMove::PlacePiece { from, to } => format!("{}-{}", from, to),
            ChessGameMove::Resign => String::from("resign"),
        }
    }
}

impl TurnBasedGame<ChessGameMove> for ChessGame {
    fn min_players() -> Option<usize> {
        Some(2)
    }

    fn max_players() -> Option<usize> {
        Some(2)
    }

    fn initial(players: &Vec<AgentPubKey>) -> Self {
        ChessGame {
            white_address: players[0].clone(),
            black_address: players[1].clone(),
            game: Game::new(),
        }
    }

    fn apply_move( &mut self, game_move: &ChessGameMove, _players: &Vec<AgentPubKey>, author_index: usize, ) -> ExternResult<()> {
        
        match game_move {
            ChessGameMove::PlacePiece { from, to } => {

                let from = Square::from_str(from.as_str());
                let to = Square::from_str(to.as_str());
                
                if from.is_ok() && to.is_ok() {
                
                    let chess_move: ChessMove = ChessMove::new(from.unwrap(), to.unwrap(), None);
                    self.game.make_move(chess_move);

                    return Ok(());

                } else {
                    return Err(WasmError::Guest(
                        "We have issues to proccess this move input".into(),
                    ));
                }
            }
            ChessGameMove::Resign => {

                let resigner_color:Color = match author_index.clone(){
                    0 => {Color::White},
                    _ => {Color::Black},
                };

                self.game.resign(resigner_color);
                return Ok(());
            }
        }
    }

    // Gets the winner for the game // remake this method 
    fn get_winner(&self, players: &Vec<AgentPubKey>) -> Option<AgentPubKey> {
        match self.game.result() {
            Some(result) => match result {
                GameResult::WhiteCheckmates | GameResult::BlackResigns => Some(players[0].clone()),
                _ => Some(players[1].clone()),
            },
            None => None,
        }
    }
}

pub fn create_game(players: Vec<AgentPubKey>) -> ExternResult<EntryHash> {
    holochain_turn_based_game::prelude::create_game(players)
}
