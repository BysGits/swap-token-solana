import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { SwapToken } from '../target/types/swap_token';
require("dotenv").config();

import { pool_seed, token_pool_seed, pool_owner_seed, tx_id_01, tx_id_02 } from "../seeds/seed";

const program = anchor.workspace.SwapToken as Program<SwapToken>;



function getPdaFromSeeds(seeds: any) {
  return PublicKey.findProgramAddressSync(
    [Uint8Array.from(seeds)],
    program.programId
  )
}

async function main() {
  // Configure client to use the provider.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  // Add your deploy script here.
  const wallet = provider.wallet as anchor.Wallet

  const ratio = new anchor.BN(process.env.RATIO)
  const mint_pk = new anchor.web3.PublicKey(process.env.MINT_PUBKEY)
  const signer_pk = new anchor.web3.PublicKey(process.env.SIGNER_PUBKEY)

  const [pda1, bump1] = getPdaFromSeeds(pool_seed)
  const [pda2, bump2] = getPdaFromSeeds(token_pool_seed)
  const [pda3, bump3] = getPdaFromSeeds(pool_owner_seed)

  console.log(`Pool account: ${pda1}`)
  console.log(`Token pool account: ${pda2}`)
  console.log(`Pool owner account: ${pda3}`)

  const ata_user = await getAssociatedTokenAddress(
    mint_pk,
    wallet.publicKey
  )
  
  const amount = new anchor.BN(process.env.INITIAL_AMOUNT)
  
  const tx = await program.methods.createPool(
    pool_seed,
    token_pool_seed,
    bump3,
    ratio,
    amount,
    Array.from(signer_pk.toBytes())
  ).accounts({
    pool: pda1,
    payer: wallet.publicKey,
    tokenMint: mint_pk,
    tokenPool: pda2,
    poolOwner: pda3,
    ownerAta: ata_user
  }).signers([wallet.payer]).rpc()

  const pool = await getAccount(anchor.getProvider().connection, pda2);
    
  console.log("Pool amount: " + pool.amount);
};

main()
    .then(async() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
