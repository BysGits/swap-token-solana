import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SwapToken } from '../target/types/swap_token';
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
import { assert } from "chai";
import * as ed from '@noble/ed25519';
const bs58 = require('bs58');
import nacl from "tweetnacl";
import { decodeUTF8 } from "tweetnacl-util";


import { pool_seed, token_pool_seed, pool_owner_seed } from "../seeds/seed";

const provider = anchor.AnchorProvider.env()
anchor.setProvider(provider);
const program = anchor.workspace.SwapToken as Program<SwapToken>;

const wallet = provider.wallet as anchor.Wallet

const rate = new anchor.BN(1)


describe("swap-token", () => {
  // Configure the client to use the local cluster.
  // const mint_kp = anchor.web3.Keypair.fromSecretKey(Uint8Array.from([101,30,253,52,242,94,201,159,59,166,152,99,237,246,248,138,92,59,181,248,118,27,49,21,77,18,200,79,56,88,175,243,208,57,120,241,60,28,12,89,214,255,204,218,183,239,184,130,179,13,113,118,17,218,101,33,220,131,107,55,203,156,113,118]))
  const mint_kp = anchor.web3.Keypair.generate()

  const signer_kp = anchor.web3.Keypair.generate()
  const MSG = Uint8Array.from(Buffer.from("this is such a good message to sign"));
  console.log(`MSG: ${Buffer.from(MSG)}`)
  const [pda1, bump1] = getPdaFromSeeds(pool_seed)
  const [pda2, bump2] = getPdaFromSeeds(token_pool_seed)
  const [pda3, bump3] = getPdaFromSeeds(pool_owner_seed)
  console.log(bump3)

  var option_bytes = Uint8Array.from([2])
  var amount_bytes = Uint8Array.from((new anchor.BN(100000000000)).toArray(undefined,8))
  const bumpy_bytes = Uint8Array.from([bump3])
  const txId_bytes = Uint8Array.from(Buffer.from("asdf"))
  var msg_bytes = new Uint8Array(option_bytes.length + amount_bytes.length + bumpy_bytes.length + txId_bytes.length)
  var offset = 0
  msg_bytes.set(bumpy_bytes, offset)
  offset += bumpy_bytes.length
  msg_bytes.set(option_bytes, offset)
  offset += option_bytes.length
  msg_bytes.set(amount_bytes, offset)
  offset += amount_bytes.length
  msg_bytes.set(txId_bytes, offset)
  console.log(Buffer.from(msg_bytes))

  let signature: Uint8Array;
  // const [pda1, bump1] = getPdaFromSeeds(pool_seed)
  
  // const user_kp = anchor.web3.Keypair.generate()
  var b = bs58.decode('4AtcXmZzdBEe6zhETa9BtHv7eHJWkPcoc77WiFAL2NJfsRwQesJaaJdBeGpKV8MoHtjGh8HsRQYpcpm6HLvzFud3');
  var j = new Uint8Array(b.buffer, b.byteOffset, b.byteLength / Uint8Array.BYTES_PER_ELEMENT);
  const user_kp = anchor.web3.Keypair.fromSecretKey(j)
  
  

  var token_owner;
  var token_user;
  var token_pool;

  console.log(program.programId.toString())
  console.log(`Mint acc: ${mint_kp.publicKey}`)
  console.log(`Pool account: ${pda1}`)
  console.log(`Token pool account: ${pda2}`)
  console.log(`Pool owner account: ${pda3}`)
  console.log(`User account: ${user_kp.publicKey}`)

  before(async() => {
    // await provider.connection.requestAirdrop(user_kp.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL)
    // Calculate Ed25519 signature
    // signature = await ed.sign(
    //   msg_bytes,
    //   signer_kp.secretKey.slice(0,32)
    // );

    signature = nacl.sign.detached(msg_bytes, signer_kp.secretKey);

    console.log(`Sig: ${signature}`)
  })

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
    token_owner = await createAccount(
      anchor.getProvider().connection,
      wallet.payer,
      mint_kp.publicKey,
      wallet.publicKey
    )

    console.log(`Newly created owner's ATA: ${token_owner}`)

    token_user = await createAccount(
      anchor.getProvider().connection,
      wallet.payer,
      mint_kp.publicKey,
      user_kp.publicKey
    )

    console.log(`Newly created user's ATA: ${token_user}`)
    
  })

  it("Mint tokens", async() => {
    const amount = 100000000000000

    const ata_user = await getAssociatedTokenAddress(
      mint_kp.publicKey,
      wallet.publicKey
    )

    console.log(ata_user.toString())

    const tx1 = await mintTo(
      anchor.getProvider().connection,
      wallet.payer,
      mint_kp.publicKey,
      ata_user,
      wallet.payer,
      amount
    )

    const tx2 = await mintTo(
      anchor.getProvider().connection,
      wallet.payer,
      mint_kp.publicKey,
      token_user,
      wallet.payer,
      amount
    )

    const ownerInfo = await getAccount(anchor.getProvider().connection, token_owner);
    const userInfo = await getAccount(anchor.getProvider().connection, token_user);
    
    console.log(ownerInfo.amount);
    console.log(userInfo.amount);
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
        rate,
        Array.from(signer_kp.publicKey.toBytes())
      ).accounts({
        pool: pda1,
        payer: wallet.publicKey,
        tokenMint: mint_kp.publicKey,
        tokenPool: pda2,
        poolOwner: pda3,
        // ownerAta: ata_user
      }).signers([wallet.payer]).rpc()
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
    try {
      var option = 1
      var amount = new anchor.BN(100000000000)
      var bumpy = bump3
      var txId: string = "asdf"

      const ata_owner = await getAssociatedTokenAddress(
        mint_kp.publicKey,
        wallet.publicKey
      )
      
      // let tx = new anchor.web3.Transaction().add(
      //   // Ed25519 instruction
      //   anchor.web3.Ed25519Program.createInstructionWithPublicKey(
      //       {
      //         publicKey: wallet.publicKey.toBytes(),
      //         message: MSG,
      //         signature: signature,
      //       }
      //   )
      // ).add(
      //     // Our instruction
      //     program.instruction.swapFixedRate(
      //         bumpy,
      //         option,
      //         amount,
      //         txId,
      //         Buffer.from(MSG),
      //         Buffer.from(signature),
      //         {
      //             accounts: {
      //                 user: user_kp.publicKey,
      //                 pool: pda1,
      //                 userToken: token_user,
      //                 tokenPool: pda2,
      //                 poolOwner: pda3,
      //                 ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      //                 systemProgram: anchor.web3.SystemProgram.programId,
      //                 tokenProgram: TOKEN_PROGRAM_ID,
      //                 rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      //             },
      //             signers: [user_kp]
      //         }
      //     )
      // );

      // Send tx
      // try {
          // await anchor.web3.sendAndConfirmTransaction(
          //     program.provider.connection,
          //     tx,
          //     [wallet.payer, user_kp]
          // );
          
          // If all goes well, we're good!
      // } catch (error) {
      //     assert.fail(`Should not have failed with the following error:\n${error.msg}`);
      // }

      const tx = await program.methods.swapFixedRate(
        bumpy, option, amount, txId, Array.from(signature)
      ).accounts({
        user: user_kp.publicKey,
        pool: pda1,
        userToken: token_user,
        tokenPool: pda2,
        poolOwner: pda3,
        ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY
      }).signers([user_kp])
      .rpc()

      const pool = await getAccount(anchor.getProvider().connection, pda2);
      
      console.log(pool.amount);
    } catch (e) {
      console.log(e)
    }
  })

  it("Swap point for token", async() => {
    try {
      var option = 2
      var amount = new anchor.BN(100000000000)
      const bumpy = bump3
      const txId: string = "asdf"

      const ata_owner = await getAssociatedTokenAddress(
        mint_kp.publicKey,
        wallet.publicKey
      )
      
      // let tx = new anchor.web3.Transaction().add(
      //   // Ed25519 instruction
      //   anchor.web3.Ed25519Program.createInstructionWithPublicKey(
      //       {
      //           publicKey: wallet.publicKey.toBytes(),
      //           message: MSG,
      //           signature: signature,
      //       }
      //   )
      // ).add(
      //     // Our instruction
      //     program.instruction.swapFixedRate(
      //         bumpy,
      //         option,
      //         amount,
      //         txId,
      //         Buffer.from(MSG),
      //         Buffer.from(signature),
      //         {
      //             accounts: {
      //                 user: user_kp.publicKey,
      //                 pool: pda1,
      //                 userToken: token_user,
      //                 tokenPool: pda2,
      //                 poolOwner: pda3,
      //                 ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      //                 systemProgram: anchor.web3.SystemProgram.programId,
      //                 tokenProgram: TOKEN_PROGRAM_ID,
      //                 rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      //             },
      //             signers: [user_kp]
      //         }
      //     )
      // );

      // Send tx
      // try {
          // await anchor.web3.sendAndConfirmTransaction(
          //     program.provider.connection,
          //     tx,
          //     [wallet.payer, user_kp]
          // );
          
          // If all goes well, we're good!
      // } catch (error) {
      //     assert.fail(`Should not have failed with the following error:\n${error.msg}`);
      // }
      
      const tx = await program.methods.swapFixedRate(
        bumpy, 
        option, 
        amount, 
        txId, 
        Array.from(signature)
      ).accounts({
        user: user_kp.publicKey,
        pool: pda1,
        userToken: token_user,
        tokenPool: pda2,
        poolOwner: pda3,
        ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY
      }).signers([user_kp])
      .preInstructions([
        anchor.web3.Ed25519Program.createInstructionWithPublicKey(
          {
              publicKey: signer_kp.publicKey.toBytes(),
              message: msg_bytes,
              signature: signature,
          }
        )
      ]).rpc()

      const pool = await getAccount(anchor.getProvider().connection, pda2);
      
      console.log(pool.amount);

    } catch(e) {
      console.log(e)
    }
  })

  // it("Swap point for token failed", async() => {
  //   try {
  //     var option = 2
  //     var amount = new anchor.BN(100000000000000)
  //     const bumpy = bump3
  //     const txId: string = "asdf"

  //     const ata_owner = await getAssociatedTokenAddress(
  //       mint_kp.publicKey,
  //       wallet.publicKey
  //     )
      
      
  //     const tx = await program.methods.swapFixedRate(
  //       bumpy, option, amount, txId
  //     ).accounts({
  //       user: user_kp.publicKey,
  //       pool: pda1,
  //       userToken: token_user,
  //       tokenPool: pda2,
  //       poolOwner: pda3,
  //     }).signers([user_kp]).rpc()

  //     const pool = await getAccount(anchor.getProvider().connection, pda2);
      
  //     console.log(pool.amount);

  //   } catch(e) {
  //     console.log(e)
  //   }
  // })
  
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

function getPoolPda() {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(anchor.utils.bytes.utf8.encode("POOL_SEED"))],
    program.programId
  )
}

function get_seeds(seed_str: any) {
  return [...seed_str].map((char) => char.codePointAt())
}
