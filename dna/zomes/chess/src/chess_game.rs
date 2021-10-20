use chess::{ChessMove, Color, Game, GameResult, Piece, Square};
use hc_mixin_turn_based_game::{GameOutcome, TurnBasedGame};
use hdk::prelude::holo_hash::*;
use hdk::prelude::*;
use std::str::FromStr;

#[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
pub struct ChessGame {
    pub white_address: AgentPubKeyB64,
    pub black_address: AgentPubKeyB64,
    pub board_state: String,
}

#[derive(Clone, SerializedBytes, Deserialize, Serialize, Debug)]
pub enum ChessGameResult {
    Winner(AgentPubKeyB64),
    Draw,
}

#[derive(Clone, SerializedBytes, Deserialize, Serialize, Debug)]
#[serde(tag = "type")]
pub enum ChessGameMove {
    PlacePiece {
        from: String,
        to: String,
        promotion: Option<String>,
    },
    Resign,
}

fn promotion_piece(piece: String) -> ExternResult<Piece> {
    match piece.as_str() {
        "Queen" => Ok(Piece::Queen),
        "Rook" => Ok(Piece::Rook),
        "Knight" => Ok(Piece::Knight),
        "Bishop" => Ok(Piece::Bishop),
        _ => Err(WasmError::Guest("Invalid piece to promote to".into())),
    }
}

impl TurnBasedGame for ChessGame {
    type GameMove = ChessGameMove;
    type GameResult = ChessGameResult;

    fn min_players() -> Option<usize> {
        Some(2)
    }

    fn max_players() -> Option<usize> {
        Some(2)
    }

    fn initial(players: Vec<AgentPubKeyB64>) -> Self {
        ChessGame {
            white_address: players[0].clone().into(),
            black_address: players[1].clone().into(),
            board_state: Game::new().current_position().to_string(),
        }
    }

    fn apply_move(
        &mut self,
        game_move: ChessGameMove,
        author: AgentPubKeyB64,
        players: Vec<AgentPubKeyB64>,
    ) -> ExternResult<()> {
        let mut game = Game::from_str(self.board_state.as_str())
            .or(Err(WasmError::Guest("Invalid board state".into())))?;

        match game_move {
            ChessGameMove::PlacePiece {
                from,
                to,
                promotion,
            } => {
                let from = Square::from_str(from.as_str())
                    .or(Err(WasmError::Guest("Malformed move".into())))?;
                let to = Square::from_str(to.as_str())
                    .or(Err(WasmError::Guest("Malformed move".into())))?;

                let promotion_piece = match promotion {
                    Some(p) => Some(promotion_piece(p.clone())?),
                    None => None,
                };

                let chess_move: ChessMove = ChessMove::new(from, to, promotion_piece);

                if !game.current_position().legal(chess_move.clone()) {
                    return Err(WasmError::Guest("Illegal move".into()));
                }
                game.make_move(chess_move);
            }
            ChessGameMove::Resign => {
                if game.result().is_some() {
                    return Err(WasmError::Guest("Game was already finished".into()));
                }

                let resigner_color: Color = match author.eq(&players[0]) {
                    true => Color::White,
                    false => Color::Black,
                };

                game.resign(resigner_color);
            }
        }

        self.board_state = game.current_position().to_string();
        return Ok(());
    }

    // Gets the winner for the game // remake this method
    fn outcome(&self, players: Vec<AgentPubKeyB64>) -> GameOutcome<ChessGameResult> {
        let game = Game::from_str(self.board_state.as_str()).expect("Invalid board state");

        match game.result() {
            Some(result) => match result {
                GameResult::DrawAccepted | GameResult::DrawDeclared | GameResult::Stalemate => {
                    GameOutcome::Finished(ChessGameResult::Draw)
                }
                GameResult::WhiteCheckmates | GameResult::BlackResigns => {
                    GameOutcome::Finished(ChessGameResult::Winner(players[0].clone()))
                }
                _ => GameOutcome::Finished(ChessGameResult::Winner(players[1].clone())),
            },
            None => GameOutcome::Ongoing,
        }
    }
}

#[derive(Clone, SerializedBytes, Deserialize, Serialize, Debug)]
pub struct MakeMoveInput {
    pub game_hash: EntryHashB64,
    pub previous_move_hash: Option<HeaderHashB64>,
    pub game_move: ChessGameMove,
}
