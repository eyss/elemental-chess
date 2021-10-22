use chess::{ChessMove, Game, GameResult, Piece, Square};
use hc_mixin_turn_based_game::{GameStatus, TurnBasedGame};
use hdk::prelude::holo_hash::*;
use hdk::prelude::*;
use std::str::FromStr;

#[derive(Clone, Debug, Serialize, Deserialize, SerializedBytes)]
pub struct ChessGame {
    pub white_address: AgentPubKeyB64,
    pub black_address: AgentPubKeyB64,
    pub resigned_player: Option<AgentPubKeyB64>,
    pub board_state: String,
}

pub enum ChessGameResult {
    Draw,
    Winner(AgentPubKeyB64),
}

impl ChessGame {
    pub fn game_state(&self) -> ExternResult<Game> {
        Game::from_str(self.board_state.as_str())
            .or(Err(WasmError::Guest("Invalid board state".into())))
    }

    pub fn get_result(&self) -> ExternResult<Option<ChessGameResult>> {
        let game = self.game_state()?;

        if let Some(player) = self.resigned_player.clone() {
            return match self.white_address.eq(&player) {
                true => Ok(Some(ChessGameResult::Winner(self.black_address.clone()))),
                false => Ok(Some(ChessGameResult::Winner(self.white_address.clone()))),
            };
        }

        match game.result() {
            None => Ok(None),
            Some(result) => match result {
                GameResult::DrawAccepted | GameResult::DrawDeclared | GameResult::Stalemate => {
                    Ok(Some(ChessGameResult::Draw))
                }
                GameResult::BlackCheckmates | GameResult::WhiteResigns => {
                    Ok(Some(ChessGameResult::Winner(self.black_address.clone())))
                }
                GameResult::WhiteCheckmates | GameResult::BlackResigns => {
                    Ok(Some(ChessGameResult::Winner(self.white_address.clone())))
                }
            },
        }
    }
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
            resigned_player: None,
            board_state: Game::new().current_position().to_string(),
        }
    }

    fn apply_move(
        self,
        game_move: ChessGameMove,
        author: AgentPubKeyB64,
    ) -> ExternResult<ChessGame> {
        let mut chess_game = self.clone();
        let mut game = chess_game.game_state()?;

        if game.result().is_some() {
            return Err(WasmError::Guest("Game was already finished".into()));
        }

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
                chess_game.resigned_player = Some(author);
            }
        }

        chess_game.board_state = game.current_position().to_string();
        return Ok(chess_game);
    }

    // Gets the winner for the game
    fn status(&self) -> GameStatus {
        if let Some(_) = self.resigned_player {
            return GameStatus::Finished;
        }

        let game = Game::from_str(self.board_state.as_str()).expect("Invalid board state");

        match game.result() {
            Some(_) => GameStatus::Finished,
            None => GameStatus::Ongoing,
        }
    }
}

#[derive(Clone, SerializedBytes, Deserialize, Serialize, Debug)]
pub struct MakeMoveInput {
    pub game_hash: EntryHashB64,
    pub previous_move_hash: Option<HeaderHashB64>,
    pub game_move: ChessGameMove,
}
