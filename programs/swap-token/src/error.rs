use anchor_lang::prelude::*;

#[error_code]
pub enum SwapError {
    #[msg("Swap data already exists")]
    SwapDataExist,
    #[msg("Amount is zero")]
    AmountIsZero,
    #[msg("Amount exceeds balance")]
    AmountExceedBalance,
    #[msg("Not enough token to withdraw")]
    InsufficientWithdrawn,
    #[msg("Invalid signature")]
    InvalidSignature,
}