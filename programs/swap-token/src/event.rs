use anchor_lang::prelude::*;

#[event]
pub struct CreatedPool {
    pub creator: Pubkey,
    pub time_created: i64,
}

#[event]
pub struct AddedLiquidity {
    pub account: Pubkey,
    pub amount: u64,
    pub time_added: i64,
}

#[event]
pub struct SwapCompleted {
    pub internal_tx_id: String,
    pub token: u64,
    pub point: u64,
    pub time_swap: i64,
    pub user: Pubkey,
    pub msg: Vec<u8>,
}


#[event]
pub struct SwapFailed {
    pub user: Pubkey,
}