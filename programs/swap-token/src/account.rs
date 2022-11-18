use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer};
use solana_program::instruction::Instruction;
use solana_program::sysvar::instructions::{ID as IX_ID, load_instruction_at_checked};

use crate::utils::*;

pub const POOL_OWNER_SEEDS: &[u8; 10] = b"pool_owner";

#[account]
pub struct PoolAccount {
    pub bump: u8,
    pub rate: u64,            // 8
    pub token_mint: Pubkey,  // 32
    pub token_pool: Pubkey,  // 32
    // pub token2_mint: Pubkey,  // 32
    // pub token2_pool: Pubkey,  // 32
    pub pool_creator: Pubkey, // 32
    pub pool_owner: Pubkey,   // 32
    pub signer: [u8; 32],     // 32
}

#[account]
pub struct SwapData {
    pub invalid_tx_id: bool,
}

#[derive(Accounts)]
#[instruction(pool_seed: [u8; 12], token_pool_seed: [u8; 12])]
pub struct CreatePool<'info> {
    #[account(
        init,
        payer=payer,
        seeds=[&pool_seed],
        bump,
        space=8+8+(5*32)+1
    )]
    pub pool: Account<'info, PoolAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_mint: Account<'info, Mint>,

    #[account(
        init,
        payer=payer,
        seeds=[&token_pool_seed],
        bump,
        token::mint=token_mint,
        token::authority=pool_owner
    )]
    pub token_pool: Account<'info, TokenAccount>,

    /// CHECK: None
    #[account(
        init_if_needed,
        seeds=[POOL_OWNER_SEEDS.as_ref()],
        bump,
        payer=payer,
        space=8+8,
    )]
    pub pool_owner: AccountInfo<'info>,

    #[account(
        mut,
        constraint=owner_ata.owner==payer.key(),
        constraint=owner_ata.mint==token_mint.key(),
    )]
    pub owner_ata: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,

    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(pool_seed: [u8; 12], token_pool_seed: [u8; 12])]
pub struct AddLiquidity<'info> {
    #[account(
        seeds=[&pool_seed],
        bump,
        has_one = pool_owner,
    )]
    pub pool: Account<'info, PoolAccount>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
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
#[instruction(internal_tx_id: String)]
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

    #[account(
        init_if_needed,
        payer = user,
        seeds = [&internal_tx_id.clone().into_bytes()],
        bump,
        space = 8 + 1,
    )]
    pub swap_data: Account<'info, SwapData>,

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

    /// CHECK: unchecked
    #[account(address = IX_ID)]
    pub ix_sysvar: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,

    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(internal_tx_id: String)]
pub struct CancelSwap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub pool: Account<'info, PoolAccount>,

    #[account(
        init_if_needed,
        payer = user,
        seeds = [&internal_tx_id.clone().into_bytes()],
        bump,
        space = 8 + 1,
    )]
    pub swap_data: Account<'info, SwapData>,

    /// CHECK: none
    #[account(
        mut, 
        seeds = [POOL_OWNER_SEEDS.as_ref()],
        bump,
        constraint = pool_owner.key() == pool.pool_owner
    )]
    pub pool_owner: AccountInfo<'info>,

    /// CHECK: unchecked
    #[account(address = IX_ID)]
    pub ix_sysvar: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,

    pub rent: Sysvar<'info, Rent>,
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

    /// External instruction that only gets executed if
    /// an `Ed25519Program.createInstructionWithPublicKey`
    /// instruction was sent in the same transaction.
    pub fn verify_ed25519(&self, pubkey: [u8; 32], msg: Vec<u8>, sig: [u8; 64]) -> Result<()> {
        // Get what should be the Ed25519Program instruction
        let ix: Instruction = load_instruction_at_checked(0, self.ix_sysvar.as_ref())?;

        // Check that ix is what we expect to have been sent
        utils::verify_ed25519_ix(&ix, &pubkey, &msg, &sig)?;

        // Do other stuff
        
        Ok(())
    }

    /// External instruction that only gets executed if
    /// a `Secp256k1Program.createInstructionWithEthAddress`
    /// instruction was sent in the same transaction.
    pub fn verify_secp(&self, eth_address: [u8; 20], msg: Vec<u8>, sig: [u8; 64], recovery_id: u8) -> Result<()> {
        // Get what should be the Secp256k1Program instruction
        let ix: Instruction = load_instruction_at_checked(0, self.ix_sysvar.as_ref())?;

        // Check that ix is what we expect to have been sent
        utils::verify_secp256k1_ix(&ix, &eth_address, &msg, &sig, recovery_id)?;

        // Do other stuff
        
        Ok(())
    }
    
}

impl<'info> CancelSwap<'info> {
    /// External instruction that only gets executed if
    /// an `Ed25519Program.createInstructionWithPublicKey`
    /// instruction was sent in the same transaction.
    pub fn verify_ed25519(&self, pubkey: [u8; 32], msg: Vec<u8>, sig: [u8; 64]) -> Result<()> {
        // Get what should be the Ed25519Program instruction
        let ix: Instruction = load_instruction_at_checked(0, self.ix_sysvar.as_ref())?;

        // Check that ix is what we expect to have been sent
        utils::verify_ed25519_ix(&ix, &pubkey, &msg, &sig)?;

        // Do other stuff
        
        Ok(())
    }

    /// External instruction that only gets executed if
    /// a `Secp256k1Program.createInstructionWithEthAddress`
    /// instruction was sent in the same transaction.
    pub fn verify_secp(&self, eth_address: [u8; 20], msg: Vec<u8>, sig: [u8; 64], recovery_id: u8) -> Result<()> {
        // Get what should be the Secp256k1Program instruction
        let ix: Instruction = load_instruction_at_checked(0, self.ix_sysvar.as_ref())?;

        // Check that ix is what we expect to have been sent
        utils::verify_secp256k1_ix(&ix, &eth_address, &msg, &sig, recovery_id)?;

        // Do other stuff
        
        Ok(())
    }
    
}
