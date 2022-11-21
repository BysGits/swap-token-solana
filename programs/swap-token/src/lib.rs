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
        bumpy: u8,
        rate: u64,
        amount: u64,
        signer: [u8; 32],
    ) -> Result<()> {
        let pool_account = &mut ctx.accounts.pool;
        pool_account.bump = bumpy;
        pool_account.rate = rate;
        pool_account.pool_creator = *ctx.accounts.payer.key;
        pool_account.token_mint = ctx.accounts.token_mint.key().clone();
        pool_account.token_pool = ctx.accounts.token_pool.key().clone();
        pool_account.pool_owner = ctx.accounts.pool_owner.key().clone();
        pool_account.signer = signer;

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

        emit!(CreatedPool{
            creator: pool_account.pool_creator,
            time_created: Clock::get().unwrap().unix_timestamp,
        });
        Ok(())
    }

    pub fn update_pool_info(
        ctx: Context<UpdatePool>, 
        _pool_seed: [u8; 12],
        ratio: u64, 
        signer: [u8; 32]
    ) -> Result<()> {
        let pool_account = &mut ctx.accounts.pool;
        pool_account.rate = ratio;
        pool_account.signer = signer;

        emit!(UpdatedPool{
            user: pool_account.pool_creator,
            time_updated: Clock::get().unwrap().unix_timestamp,
        });

        Ok(())
    }

    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        _pool_seed: [u8; 12],
        _token_pool_seed: [u8; 12],
        amount: u64,
    ) -> Result<()> {
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

        emit!(AddedLiquidity {
            account: ctx.accounts.owner_ata.key(),
            amount: amount,
            time_added: Clock::get().unwrap().unix_timestamp,
        });
        Ok(())
    }

    pub fn swap_usdt_to_diamond(
        ctx: Context<SwapToken>,
        _internal_tx_id: String,
        amount: u64
    ) -> Result<()> {
        if ctx.accounts.swap_data.invalid_tx_id == true {
            emit!(SwapFailed {
                user: ctx.accounts.user.key()
            });
            return err!(SwapError::TxIdCanceled);
        }

        if amount == 0 {
            emit!(SwapFailed {
                user: ctx.accounts.user.key()
            });
            return err!(SwapError::AmountIsZero);
        }

        let pool = ctx.accounts.pool.clone();

        if ctx.accounts.user_token.amount < amount {
            emit!(SwapFailed {
                user: ctx.accounts.user.key()
            });
            return err!(SwapError::AmountExceedBalance);
        }

        let point_to_get = how_much_to_get(1, amount, pool.rate);

        transfer(
            ctx.accounts.transfer_token(
                ctx.accounts.user_token.clone(), 
                ctx.accounts.token_pool.clone(), 
                ctx.accounts.user.to_account_info(),
            ),
            amount,
        )?;

        let swap_data = &mut ctx.accounts.swap_data;
        swap_data.invalid_tx_id = true;
        

        emit!(SwapCompleted {
            internal_tx_id: _internal_tx_id,
            token: amount,
            point: point_to_get,
            time_swap: Clock::get().unwrap().unix_timestamp,
            user: ctx.accounts.user.key(),
        });

        Ok(())
    }

    pub fn swap_playing_token(
        ctx: Context<SwapToken>,
        _internal_tx_id: String,
        swap_option: u8,
        amount: u64,
        sig: [u8; 64],
    ) -> Result<()> {
        if ctx.accounts.swap_data.invalid_tx_id == true {
            emit!(SwapFailed {
                user: ctx.accounts.user.key()
            });
            return err!(SwapError::TxIdCanceled);
        }

        if amount == 0 {
            emit!(SwapFailed {
                user: ctx.accounts.user.key()
            });
            return err!(SwapError::AmountIsZero);
        }

        let pool = ctx.accounts.pool.clone();
        let message = get_message_bytes(pool.bump, swap_option.clone(), pool.token_pool, amount.clone(), _internal_tx_id.clone());

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
                    internal_tx_id: _internal_tx_id,
                    token: amount,
                    point: point_to_get,
                    time_swap: Clock::get().unwrap().unix_timestamp,
                    user: ctx.accounts.user.key(),
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
                ctx.accounts.verify_ed25519(
                    pool.signer, 
                    message.clone(), 
                    sig
                )?;

                transfer (
                    ctx.accounts.transfer_token(
                        ctx.accounts.token_pool.clone(), 
                        ctx.accounts.user_token.clone(), 
                        ctx.accounts.pool_owner.to_account_info()
                    )
                    .with_signer(&[&[account::POOL_OWNER_SEEDS, &[pool.bump]]]),
                    token_to_get,
                )?;

                emit!(SwapCompleted {
                    internal_tx_id: _internal_tx_id,
                    token: token_to_get,
                    point: amount,
                    time_swap: Clock::get().unwrap().unix_timestamp,
                    user: ctx.accounts.user.key(),
                });
            }
            _ => panic!("Unknown value")
        }

        let swap_data = &mut ctx.accounts.swap_data;
        swap_data.invalid_tx_id = true;

        Ok(())
    }

    pub fn swap_flipking_token(
        ctx: Context<SwapToken>,
        _internal_tx_id: String,
        swap_option: u8,
        amount: u64,
        sig: [u8; 64],
    ) -> Result<()> {
        if ctx.accounts.swap_data.invalid_tx_id == true {
            emit!(SwapFailed {
                user: ctx.accounts.user.key()
            });
            return err!(SwapError::TxIdCanceled);
        }

        if amount == 0 {
            emit!(SwapFailed {
                user: ctx.accounts.user.key()
            });
            return err!(SwapError::AmountIsZero);
        }
        
        let pool = ctx.accounts.pool.clone();
        let message = get_message_bytes(pool.bump, swap_option.clone(), pool.token_pool, amount.clone(), _internal_tx_id.clone());

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
                    internal_tx_id: _internal_tx_id,
                    token: amount,
                    point: point_to_get,
                    time_swap: Clock::get().unwrap().unix_timestamp,
                    user: ctx.accounts.user.key(),
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
                ctx.accounts.verify_ed25519(
                    pool.signer, 
                    message.clone(), 
                    sig
                )?;

                transfer (
                    ctx.accounts.transfer_token(
                        ctx.accounts.token_pool.clone(), 
                        ctx.accounts.user_token.clone(), 
                        ctx.accounts.pool_owner.to_account_info()
                    )
                    .with_signer(&[&[account::POOL_OWNER_SEEDS, &[pool.bump]]]),
                    token_to_get,
                )?;

                emit!(SwapCompleted {
                    internal_tx_id: _internal_tx_id,
                    token: token_to_get,
                    point: amount,
                    time_swap: Clock::get().unwrap().unix_timestamp,
                    user: ctx.accounts.user.key(),
                });
            }
            _ => panic!("Unknown value")
        }

        let swap_data = &mut ctx.accounts.swap_data;
        swap_data.invalid_tx_id = true;

        Ok(())
    }

    pub fn cancel_swap(
        ctx: Context<CancelSwap>, 
        _internal_tx_id: String,
        swap_option: u8,
        amount: u64,
        sig: [u8; 64],
    ) -> Result<()> {
        if ctx.accounts.swap_data.invalid_tx_id == true {
            emit!(SwapFailed {
                user: ctx.accounts.user.key()
            });
            return err!(SwapError::TxIdCanceled);
        }

        let pool = ctx.accounts.pool.clone();
        let message = get_message_bytes(pool.bump, swap_option.clone(), pool.token_pool, amount.clone(), _internal_tx_id.clone());

        // verify signature
        ctx.accounts.verify_ed25519(
            pool.signer, 
            message.clone(), 
            sig
        )?;

        let swap_data = &mut ctx.accounts.swap_data;
        swap_data.invalid_tx_id = true;

        emit!(CanceledSwap {
            internal_tx_id: _internal_tx_id,
            time_cancel: Clock::get().unwrap().unix_timestamp,
            user: ctx.accounts.user.key(),
        });

        Ok(())

    }

    
}

