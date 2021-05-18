use chess::{ChessMove, Color, Game, GameResult, Square};
use hdk::prelude::*;
use holo_hash::{AgentPubKeyB64, EntryHashB64};
use holochain_turn_based_game::prelude::TurnBasedGame;
use std::str::FromStr;

#[derive(Clone, Debug)]
pub struct ChessGame {
    pub white_address: AgentPubKeyB64,
    pub black_address: AgentPubKeyB64,
    pub game: Game,
}

impl Into<String> for ChessGame {
    fn into(self) -> String {
        format!("{}", self.game.current_position())
    }
}

#[derive(Clone, SerializedBytes, Deserialize, Serialize, Debug)]
#[serde(tag = "type")]
pub enum ChessGameMove {
    PlacePiece { from: String, to: String },
    Resign,
}


impl TurnBasedGame<ChessGameMove> for ChessGame {
    fn min_players() -> Option<usize> {
        Some(2)
    }

    fn max_players() -> Option<usize> {
        Some(2)
    }

    fn initial(players: &Vec<AgentPubKeyB64>) -> Self {
        ChessGame {
            white_address: players[0].clone().into(),
            black_address: players[1].clone().into(),
            game: Game::new(),
        }
    }

    fn apply_move(
        &mut self,
        game_move: &ChessGameMove,
        _players: &Vec<AgentPubKeyB64>,
        author_index: usize,
    ) -> ExternResult<()> {
        match game_move {
            ChessGameMove::PlacePiece { from, to } => {
                let from = Square::from_str(from.as_str())
                    .or(Err(WasmError::Guest("Malformed move".into())))?;
                let to = Square::from_str(to.as_str())
                    .or(Err(WasmError::Guest("Malformed move".into())))?;

                let chess_move: ChessMove = ChessMove::new(from, to, None);

                if !self.game.current_position().legal(chess_move.clone()) {
                    return Err(WasmError::Guest("Illegal move".into()));
                }
                self.game.make_move(chess_move);

                return Ok(());
            }
            ChessGameMove::Resign => {
                if self.game.result().is_some() {
                    return Err(WasmError::Guest("Game was already finished".into()));
                }

                let resigner_color: Color = match author_index.clone() {
                    0 => Color::White,
                    _ => Color::Black,
                };

                self.game.resign(resigner_color);
                return Ok(());
            }
        }
    }

    // Gets the winner for the game // remake this method
    fn get_winner(&self, players: &Vec<AgentPubKeyB64>) -> Option<AgentPubKeyB64> {
        match self.game.result() {
            Some(result) => match result {
                GameResult::WhiteCheckmates | GameResult::BlackResigns => Some(players[0].clone()),
                _ => Some(players[1].clone()),
            },
            None => None,
        }
    }
}

#[derive(Clone, SerializedBytes, Deserialize, Serialize, Debug)]
pub struct MakeMoveInput {
    pub game_hash: EntryHashB64,
    pub previous_move_hash: Option<EntryHashB64>,
    pub game_move: ChessGameMove,
}
