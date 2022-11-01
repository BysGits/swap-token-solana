use anchor_lang::prelude::*;

#[derive(AnchorDeserialize, AnchorSerialize)]
pub enum Swap {
    TokenForPoint {
        amount: u64,
    },
    PointForToken {
        amount: u64,
    },
}

impl Swap {
    pub fn how_much_to_get(&self, rate: u64) -> u64 {
        match self {
            Swap::TokenForPoint { amount } => amount / rate,
            Swap::PointForToken { amount } => amount * rate,
        }
    }
}
