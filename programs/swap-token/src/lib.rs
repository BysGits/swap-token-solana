use anchor_lang::prelude::*;
use anchor_spl::token::{ transfer, Transfer };

use account::*;
use helper::*;
use event::*;
use error::*;

mod account;
mod helper;
mod error;
mod event;
mod utils;

declare_id!("53kTWZewdo52SxADmfHWnup92xPjw9ZgdzLNS3tDCrQq");

#[program]
pub mod swap_token {
    use super::*;

    pub fn create_pool(
        ctx: Context<CreatePool>,
        _pool_seed: [u8; 12],
        _token_pool_seed: [u8; 12],
        rate: u64,
        signer: [u8; 32],
    ) -> Result<()> {
        let pool_account = &mut ctx.accounts.pool;
        pool_account.rate = rate;
        pool_account.pool_creator = *ctx.accounts.payer.key;
        pool_account.token_mint = ctx.accounts.token_mint.key().clone();
        pool_account.token_pool = ctx.accounts.token_pool.key().clone();
        pool_account.pool_owner = ctx.accounts.pool_owner.key().clone();
        pool_account.signer = signer;
        Ok(())
    }

    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        _pool_seed: [u8; 12],
        _token_pool_seed: [u8; 12],
        amount: u64,
    ) -> Result<()> {
        // let pool_account = &mut ctx.accounts.pool;

        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer{
                    from: ctx.accounts.owner_ata.to_account_info(),
                    to: ctx.accounts.token_pool.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
        )?;
        Ok(())
    }

    pub fn swap_fixed_rate(
        ctx: Context<SwapToken>,
        bumpy: u8,
        swap_option: u8,
        amount: u64,
        internal_tx_id: String,
        sig: [u8; 64],
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let message = get_message_bytes(bumpy.clone(), swap_option.clone(), amount.clone(), internal_tx_id.clone());

        match swap_option {
            1 => {
                if ctx.accounts.user_token.amount < amount {
                    emit!(SwapFailed {
                        user: ctx.accounts.user.key()
                    });
                    return err!(SwapError::AmountExceedBalance);
                }

                let point_to_get = how_much_to_get(swap_option, amount, pool.rate);

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
                    msg: message,
                });
            }

            2 => {
                let token_to_get = how_much_to_get(swap_option, amount, pool.rate);

                if ctx.accounts.token_pool.amount < token_to_get {
                    emit!(SwapFailed {
                        user: ctx.accounts.user.key()
                    });
                    return err!(SwapError::InsufficientWithdrawn);
                }

                // verify signature
                let pool_account = ctx.accounts.pool.clone();
                ctx.accounts.verify_ed25519(
                    pool_account.signer, 
                    message.clone(), 
                    sig
                )?;

                // let ix: Instruction = load_instruction_at_checked(0, &ctx.accounts.ix_sysvar)?;

                // verify_ed25519_ix(&ix, &pool_account.signer, &msg, &sig)?;

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
                    msg: message,
                });
            }
            _ => panic!("Unknown value")
        }

        Ok(())
    }
}

