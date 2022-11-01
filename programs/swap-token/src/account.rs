use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};

pub const POOL_OWNER_SEEDS: &[u8] = b"POOL_OWNER";

#[account]
pub struct PoolAccount {
    pub rate: u64,            // 8
    pub token_mint: Pubkey,  // 32
    pub token_pool: Pubkey,  // 32
    // pub token2_mint: Pubkey,  // 32
    // pub token2_pool: Pubkey,  // 32
    pub pool_creator: Pubkey, // 32
    pub pool_owner: Pubkey,   // 32
}

// #[account]
// #[derive(Default)]
// pub struct SwapData {
//     pub authority: Pubkey,
//     pub amountIn: u128,
//     pub amountOut: u128,
//     pub swapTime: u128,
// }

#[derive(Accounts)]
#[instruction(pool_seed: [u8; 8], token_pool_seed: [u8; 8])]
pub struct CreatePool<'info> {
    #[account(
        init_if_needed,
        payer=payer,
        seeds=[&pool_seed],
        bump,
        space=8+8+(4*32)
    )]
    pub pool: Account<'info, PoolAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    // #[account(
    //     init_if_needed,
    //     payer=payer,
    //     mint::decimals = 9,
    //     mint::authority=payer,
    //     mint::freeze_authority=pool_owner
    // )]
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer=payer,
        seeds=[&token_pool_seed],
        bump,
        token::mint=token_mint,
        token::authority=pool_owner
    )]
    pub token_pool: Account<'info, TokenAccount>,

    /// CHECK: None
    #[account(
        mut,
        seeds=[POOL_OWNER_SEEDS.as_ref()],
        bump
    )]
    pub pool_owner: AccountInfo<'info>,

    // /// CHECK: none
    // #[account(mut)]
    // pub owner_ata: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,

    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(pool_seed: [u8; 8], token_pool_seed: [u8; 8])]
pub struct AddLiquidity<'info> {
    #[account(
        seeds=[&pool_seed],
        bump,
    )]
    pub pool: Account<'info, PoolAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds=[&token_pool_seed],
        bump,
        constraint=token_pool.mint==pool.token_mint,
        constraint=token_pool.owner==pool_owner.key(),
    )]
    pub token_pool: Account<'info, TokenAccount>,

    /// CHECK: None
    #[account(
        seeds=[POOL_OWNER_SEEDS.as_ref()],
        bump
    )]
    pub pool_owner: AccountInfo<'info>,

    #[account(
        mut,
        constraint=owner_ata.owner==payer.key(),
        constraint=owner_ata.mint==pool.token_mint,
    )]
    pub owner_ata: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,

    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SwapToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub pool: Account<'info, PoolAccount>,

    #[account(
        mut,
        constraint=user_token.owner==user.key(),
        constraint=user_token.mint==pool.token_mint,
    )]
    pub user_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub token_pool: Account<'info, TokenAccount>,

    /// CHECK: none
    #[account(
        mut, 
        seeds = [POOL_OWNER_SEEDS.as_ref()],
        bump,
        constraint = pool_owner.key() == pool.pool_owner
    )]
    pub pool_owner: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

impl<'info> SwapToken<'info> {
    pub fn transfer_token(
        &self,
        from: Account<'info, TokenAccount>,
        to: Account<'info, TokenAccount>,
        authority: AccountInfo<'info>,
    ) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: from.to_account_info().clone(),
                to: to.to_account_info().clone(),
                authority: authority.to_account_info().clone(),
            },
        )
    }
}
