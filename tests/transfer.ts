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
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedInstruction
} from "@solana/spl-token";
import { ASSOCIATED_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";
import { assert } from "chai";
import * as ed from '@noble/ed25519';
const bs58 = require('bs58');
import nacl from "tweetnacl";
import { decodeUTF8 } from "tweetnacl-util";


import { pool_seed, token_pool_seed, pool_owner_seed, tx_id_01, tx_id_02 } from "../seeds/seed";

const provider = anchor.AnchorProvider.env()
anchor.setProvider(provider);
const program = anchor.workspace.SwapToken as Program<SwapToken>;

const wallet = provider.wallet as anchor.Wallet

const rate = new anchor.BN(10)

const getMessBytes = (bumpy: number, option: number, token_pool: anchor.web3.PublicKey, amount: number, txId: String) => {
  var option_bytes = Uint8Array.from([option])
  var amount_bytes = Uint8Array.from((new anchor.BN(amount)).toArray(undefined,8))
  const bumpy_bytes = Uint8Array.from([bumpy])
  const txId_bytes = Uint8Array.from(Buffer.from(txId))
  const token_pool_bytes = token_pool.toBytes()
  var msg_bytes = new Uint8Array(option_bytes.length + amount_bytes.length + bumpy_bytes.length + txId_bytes.length + token_pool_bytes.length)
  var offset = 0
  msg_bytes.set(bumpy_bytes, offset)
  offset += bumpy_bytes.length
  msg_bytes.set(option_bytes, offset)
  offset += option_bytes.length
  msg_bytes.set(token_pool_bytes, offset)
  offset += token_pool_bytes.length
  msg_bytes.set(amount_bytes, offset)
  offset += amount_bytes.length
  msg_bytes.set(txId_bytes, offset)
  console.log(Buffer.from(msg_bytes))

  return msg_bytes
}


describe("swap-token", () => {
  const mint_kp = anchor.web3.Keypair.generate()

  const MSG = Uint8Array.from(Buffer.from("this is such a good message to sign"));
  console.log(`MSG: ${Buffer.from(MSG)}`)
  const [pda1, bump1] = getPdaFromSeeds(pool_seed)
  const [pda2, bump2] = getPdaFromSeeds(token_pool_seed)
  const [pda3, bump3] = getPdaFromSeeds(pool_owner_seed)
  console.log(bump3)

  const msg_bytes = getMessBytes(bump3, 2, pda2, 100000000000, tx_id_02)

  let signature: Uint8Array;
  // const [pda1, bump1] = getPdaFromSeeds(pool_seed)
  
  // const user_kp = anchor.web3.Keypair.generate()
  var b = bs58.decode('4AtcXmZzdBEe6zhETa9BtHv7eHJWkPcoc77WiFAL2NJfsRwQesJaaJdBeGpKV8MoHtjGh8HsRQYpcpm6HLvzFud3');
  var j = new Uint8Array(b.buffer, b.byteOffset, b.byteLength / Uint8Array.BYTES_PER_ELEMENT);
  const user_kp = anchor.web3.Keypair.fromSecretKey(j)
  
  console.log(user_kp.publicKey)

  const signer_kp = anchor.web3.Keypair.fromSecretKey(j)

  var token_owner;
  var token_user;
  var token_pool = pda2;
  var pool_owner = pda3;

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

    const tx1 = await mintTo(
      anchor.getProvider().connection,
      wallet.payer,
      mint_kp.publicKey,
      token_owner,
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

    const user = await getAccount(anchor.getProvider().connection, token_user);
      
    console.log(user.amount);
  })

  it("Transfer token", async() => {
    var amount = 1
    let tx = new anchor.web3.Transaction().add(
        createTransferCheckedInstruction(
            token_pool,
            mint_kp.publicKey,
            token_user,
            pool_owner,
            amount,
            9
        )
    );
    console.log(`txhash: ${await anchor.getProvider().sendAndConfirm()}`);
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

function getPdaFromString(string: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(string)],
    program.programId
  )
}

function get_seeds(seed_str: any) {
  return [...seed_str].map((char) => char.codePointAt())
}
