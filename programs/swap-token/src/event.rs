use anchor_lang::prelude::*;

#[event]
pub struct SwapCompleted {
    pub internal_tx_id: String,
    pub token: u64,
    pub point: u64,
    pub time_swap: i64,
    pub user: Pubkey,
}


#[event]
pub struct SwapFailed {
    pub user: Pubkey,
}