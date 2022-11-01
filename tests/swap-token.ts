import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SwapToken } from "../target/types/swap_token";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  createMint,
  createAccount,
  mintTo,
  getAssociatedTokenAddress,
  transfer,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getOrCreateAssociatedTokenAccount
} from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";

const provider = anchor.AnchorProvider.env()
anchor.setProvider(provider);
const program = anchor.workspace.SwapToken as Program<SwapToken>;

const wallet = provider.wallet as anchor.Wallet

const rate = new anchor.BN(1)


describe("swap-token", () => {
  // Configure the client to use the local cluster.
  // const mint_kp = anchor.web3.Keypair.fromSecretKey(Uint8Array.from([101,30,253,52,242,94,201,159,59,166,152,99,237,246,248,138,92,59,181,248,118,27,49,21,77,18,200,79,56,88,175,243,208,57,120,241,60,28,12,89,214,255,204,218,183,239,184,130,179,13,113,118,17,218,101,33,220,131,107,55,203,156,113,118]))
  const mint_kp = anchor.web3.Keypair.generate()
  const pool_seed = get_seeds("POOL_SEED")
  const token_pool_seed = get_seeds("TOKEN_POOL")
  const pool_owner_seed = get_seeds("POOL_OWNER")

  const [pda1, bump1] = getPdaFromSeeds(pool_seed)
  const [pda2, bump2] = getPdaFromSeeds(token_pool_seed)
  const [pda3, bump3] = getPdaFromSeeds(pool_owner_seed)

  var token_user;
  var token_pool;

  console.log(program.programId.toString())
  console.log(`Mint acc: ${mint_kp.publicKey}`)
  console.log(`Pool account: ${pda1}`)
  console.log(`Token pool account: ${pda2}`)
  console.log(`Pool owner account: ${pda3}`)

  // GK1ywcR2xxLGRDYfPTFGTrhJTBfRvBr9CsrTpJRoJTrS
  it("Create mint account", async() => {
    const mintAcc = await createMint(
      anchor.getProvider().connection,
      wallet.payer,
      wallet.publicKey,
      wallet.publicKey,
      9,
      mint_kp
    )

    console.log(`Mint: ${mintAcc}`)
  })

  // 8kCC3zyveL7PQAWQwueFgaKzKu2t56HrvooBvMvZobCZ
  it("Create token account", async() => {
    token_user = await createAccount(
      anchor.getProvider().connection,
      wallet.payer,
      mint_kp.publicKey,
      wallet.publicKey
    )

    console.log(`Newly created ATA: ${token_user}`)

    // token_pool = await getOrCreateAssociatedTokenAccount(
    //   anchor.getProvider().connection,
    //   wallet.payer,
    //   mint_kp.publicKey,
    //   wallet.publicKey
    // )
    
  })

  it("Mint tokens", async() => {
    const amount = 100000000000000

    const ata_user = await getAssociatedTokenAddress(
      mint_kp.publicKey,
      wallet.publicKey
    )

    console.log(ata_user.toString())

    const tx = await mintTo(
      anchor.getProvider().connection,
      wallet.payer,
      mint_kp.publicKey,
      ata_user,
      wallet.payer,
      amount
    )

    const accountInfo = await getAccount(anchor.getProvider().connection, token_user);

    console.log(accountInfo.amount);
  })

  it("Create pool", async() => {
    try{
      const ata_user = await getAssociatedTokenAddress(
        mint_kp.publicKey,
        wallet.publicKey
      )
      const tx = await program.methods.createPool(
        pool_seed,
        token_pool_seed,
        rate
      ).accounts({
        pool: pda1,
        payer: wallet.publicKey,
        tokenMint: mint_kp.publicKey,
        tokenPool: pda2,
        poolOwner: pda3,
        // ownerAta: ata_user
      }).signers([]).rpc()
    } catch (e) {
      console.log(e)
    }
  })

  it("Add liquidity", async() => {
    try{
      const amount = new anchor.BN(1000000000000)
      const ata_user = await getAssociatedTokenAddress(
        mint_kp.publicKey,
        wallet.publicKey
      )
      const tx = await program.methods.addLiquidity(
        pool_seed,
        token_pool_seed,
        amount
      ).accounts({
        pool: pda1,
        payer: wallet.publicKey,
        tokenPool: pda2,
        poolOwner: pda3,
        ownerAta: ata_user
      }).signers([]).rpc()
    } catch (e) {
      console.log(e)
    }
  })

  // it("Transfer tokens to newly created pda token accounts", async() => {
    
  //   const ata_user = await getAssociatedTokenAddress(
  //     mint_kp.publicKey,
  //     wallet.publicKey
  //   )

  //   const tx = await transfer(
  //     anchor.getProvider().connection,
  //     wallet.payer,
  //     ata_user,
  //     pda2,
  //     wallet.payer,
  //     amount
  //   )
  // })

  it("Swap token for point", async() => {

  })

  it("Swap point for token", async() => {

  })

  
  
});

function getPda(seed_str: any) {
  return getPdaFromSeeds(get_seeds(seed_str))
}

function getPdaFromSeeds(seeds: any) {
  return PublicKey.findProgramAddressSync(
    [Uint8Array.from(seeds)],
    program.programId
  )
}

function get_seeds(seed_str: any) {
  return [...seed_str].map((char) => char.codePointAt())
}
