use hc_mixin_elo::*;
use hdk::prelude::holo_hash::*;
use hdk::prelude::*;

#[derive(Serialize, Deserialize, Debug, SerializedBytes)]
pub struct ChessGameInfo {
    pub game_hash: EntryHashB64,
    pub last_game_move_hash: HeaderHashB64
}

pub struct ChessEloRating;

impl EloRatingSystem for ChessEloRating {
    type GameInfo = ChessGameInfo;

    fn validate_game_result(
        _game_info: ChessGameInfo,
        _result: GameResultInfo,
    ) -> ExternResult<ValidateCallbackResult> {

        
        Ok(ValidateCallbackResult::Valid)
    }
}
