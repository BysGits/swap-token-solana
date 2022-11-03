use core::panic;

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

    // pub fn from_u8(&self, value: u8) -> Swap {
    //     match value {
    //         1 => Swap::TokenForPoint { amount: () },
    //         2 => Self::PointForToken { amount: () },
    //         _ => panic!("Unknown value: {}", value),
    //     }
    // }
}

pub fn how_much_to_get(option: u8, amount: u64, rate: u64) -> u64 {
    match option {
        1 => amount / rate,
        2 => amount * rate,
        _ => panic!("Unknown value")
    }
}


