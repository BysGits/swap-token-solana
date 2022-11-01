use anchor_lang::prelude::*;
use anchor_spl::token::transfer;

use account::*;
use helper::*;
use event::*;
use error::*;

mod account;
mod helper;
mod error;
mod event;

declare_id!("53kTWZewdo52SxADmfHWnup92xPjw9ZgdzLNS3tDCrQq");

#[program]
pub mod swap_token {
    use super::*;

    pub fn create_pool(
        ctx: Context<CreatePool>,
        _pool_seed: [u8; 8],
        _token_pool_seed: [u8; 8],
        rate: u64,
    ) -> Result<()> {
        let pool_account = &mut ctx.accounts.pool;
        pool_account.rate = rate;
        pool_account.pool_creator = *ctx.accounts.payer.key;
        pool_account.token_mint = ctx.accounts.token_mint.key().clone();
        pool_account.token_pool = ctx.accounts.token_pool.key().clone();
        pool_account.pool_owner = ctx.accounts.pool_owner.key().clone();

        Ok(())
    }

    pub fn swap_fixed_rate(
        ctx: Context<SwapToken>,
        bumpy: u8,
        swap_option: Swap,
        internal_tx_id: String,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        match swap_option {
            Swap::TokenForPoint { amount } => {
                if ctx.accounts.user_token.amount < amount {
                    emit!(SwapFailed {
                        user: ctx.accounts.user.key()
                    });
                    return err!(SwapError::AmountExceedBalance);
                }

                let point_to_get = swap_option.how_much_to_get(pool.rate);

                transfer(
                    ctx.accounts.transfer_token(
                        ctx.accounts.user_token.clone(), 
                        ctx.accounts.token_pool.clone(), 
                        ctx.accounts.user.to_account_info(),
                    ),
                    amount,
                )?;

                emit!(SwapCompleted {
                    internal_tx_id: internal_tx_id,
                    token: amount,
                    point: point_to_get,
                    time_swap: Clock::get().unwrap().unix_timestamp,
                    user: ctx.accounts.user.key(),
                });
            }

            Swap::PointForToken { amount } => {
                let token_to_get = swap_option.how_much_to_get(pool.rate);

                if ctx.accounts.token_pool.amount < token_to_get {
                    emit!(SwapFailed {
                        user: ctx.accounts.user.key()
                    });
                    return err!(SwapError::InsufficientWithdrawn);
                }

                transfer (
                    ctx.accounts.transfer_token(
                        ctx.accounts.token_pool.clone(), 
                        ctx.accounts.user_token.clone(), 
                        ctx.accounts.pool_owner.to_account_info()
                    )
                    .with_signer(&[&[account::POOL_OWNER_SEEDS, &[bumpy]]]),
                    token_to_get,
                )?;

                emit!(SwapCompleted {
                    internal_tx_id: internal_tx_id,
                    token: token_to_get,
                    point: amount,
                    time_swap: Clock::get().unwrap().unix_timestamp,
                    user: ctx.accounts.user.key(),
                });
            }
        }

        Ok(())
    }
}
