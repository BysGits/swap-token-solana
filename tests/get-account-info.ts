import * as anchor from "@project-serum/anchor";
import { Program, Idl } from "@project-serum/anchor";
import {BorshCoder, EventParser, web3} from "@project-serum/anchor";
import { SwapToken } from '../target/types/swap_token';
const idl: Idl = {
    "version": "0.1.0",
    "name": "swap_token",
    "instructions": [
      {
        "name": "createPool",
        "accounts": [
          {
            "name": "pool",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "payer",
            "isMut": true,
            "isSigner": true
          },
          {
            "name": "tokenMint",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "tokenPool",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "poolOwner",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "systemProgram",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "tokenProgram",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "rent",
            "isMut": false,
            "isSigner": false
          }
        ],
        "args": [
          {
            "name": "poolSeed",
            "type": {
              "array": [
                "u8",
                12
              ]
            }
          },
          {
            "name": "tokenPoolSeed",
            "type": {
              "array": [
                "u8",
                12
              ]
            }
          },
          {
            "name": "rate",
            "type": "u64"
          },
          {
            "name": "signer",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      },
      {
        "name": "addLiquidity",
        "accounts": [
          {
            "name": "pool",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "payer",
            "isMut": true,
            "isSigner": true
          },
          {
            "name": "tokenPool",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "poolOwner",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "ownerAta",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "systemProgram",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "tokenProgram",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "rent",
            "isMut": false,
            "isSigner": false
          }
        ],
        "args": [
          {
            "name": "poolSeed",
            "type": {
              "array": [
                "u8",
                12
              ]
            }
          },
          {
            "name": "tokenPoolSeed",
            "type": {
              "array": [
                "u8",
                12
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      },
      {
        "name": "swapFixedRate",
        "accounts": [
          {
            "name": "user",
            "isMut": true,
            "isSigner": true
          },
          {
            "name": "pool",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "userToken",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "tokenPool",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "poolOwner",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "ixSysvar",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "systemProgram",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "tokenProgram",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "rent",
            "isMut": false,
            "isSigner": false
          }
        ],
        "args": [
          {
            "name": "bumpy",
            "type": "u8"
          },
          {
            "name": "swapOption",
            "type": "u8"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "internalTxId",
            "type": "string"
          },
          {
            "name": "msg",
            "type": "bytes"
          },
          {
            "name": "sig",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    ],
    "accounts": [
      {
        "name": "PoolAccount",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "rate",
              "type": "u64"
            },
            {
              "name": "tokenMint",
              "type": "publicKey"
            },
            {
              "name": "tokenPool",
              "type": "publicKey"
            },
            {
              "name": "poolCreator",
              "type": "publicKey"
            },
            {
              "name": "poolOwner",
              "type": "publicKey"
            },
            {
              "name": "signer",
              "type": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          ]
        }
      }
    ],
    "events": [
      {
        "name": "CreatedPool",
        "fields": [
          {
            "name": "creator",
            "type": "publicKey",
            "index": false
          },
          {
            "name": "timeCreated",
            "type": "i64",
            "index": false
          }
        ]
      },
      {
        "name": "AddedLiquidity",
        "fields": [
          {
            "name": "account",
            "type": "publicKey",
            "index": false
          },
          {
            "name": "amount",
            "type": "u64",
            "index": false
          },
          {
            "name": "timeAdded",
            "type": "i64",
            "index": false
          }
        ]
      },
      {
        "name": "SwapCompleted",
        "fields": [
          {
            "name": "internalTxId",
            "type": "string",
            "index": false
          },
          {
            "name": "token",
            "type": "u64",
            "index": false
          },
          {
            "name": "point",
            "type": "u64",
            "index": false
          },
          {
            "name": "timeSwap",
            "type": "i64",
            "index": false
          },
          {
            "name": "user",
            "type": "publicKey",
            "index": false
          },
          {
            "name": "msg",
            "type": "bytes",
            "index": false
          }
        ]
      },
      {
        "name": "SwapFailed",
        "fields": [
          {
            "name": "user",
            "type": "publicKey",
            "index": false
          }
        ]
      }
    ],
    "errors": [
      {
        "code": 6000,
        "name": "SwapDataExist",
        "msg": "Swap data already exists"
      },
      {
        "code": 6001,
        "name": "AmountIsZero",
        "msg": "Amount is zero"
      },
      {
        "code": 6002,
        "name": "AmountExceedBalance",
        "msg": "Amount exceeds balance"
      },
      {
        "code": 6003,
        "name": "InsufficientWithdrawn",
        "msg": "Not enough token to withdraw"
      },
      {
        "code": 6004,
        "name": "InvalidSignature",
        "msg": "Invalid signature"
      }
    ]
}

describe("Getting info", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);

  const program = anchor.workspace.SwapToken as Program<SwapToken>;

  const wallet = provider.wallet as anchor.Wallet

  it("Getting infos", async () => {
    const pk = new anchor.web3.PublicKey("53kTWZewdo52SxADmfHWnup92xPjw9ZgdzLNS3tDCrQq")
    const tx = await program.account.poolAccount.fetch("6CZUVQcVRbLw3bHCYb4xN1sJCL77EvA3wvckVZQ9j7XG")
    console.log(tx)
  });
});


const authorFilter = (authorBase58PublicKey) => ({
    memcmp: {
        offset: 8, // Discriminator.
        bytes: authorBase58PublicKey,
    },
})