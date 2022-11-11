use anchor_lang::prelude::*;

#[error_code]
pub enum SwapError {
    #[msg("Amount is zero")]
    AmountIsZero,
    #[msg("Amount exceeds balance")]
    AmountExceedBalance,
    #[msg("Not enough token to withdraw")]
    InsufficientWithdrawn,
    #[msg("Invalid signature")]
    InvalidSignature,
    #[msg("Tx ID is canceled")]
    TxIdCanceled,
}