import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

import {
  getMint,
  getAccount,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("basket-vault", () => {
  const provider =
    anchor.AnchorProvider.env();

  anchor.setProvider(
    provider
  );

  const program =
    anchor.workspace
      .BasketVault as Program;

  const tokenProgram =
    TOKEN_PROGRAM_ID;

  const JUPITER_SWAP_PROGRAM_ID =
    new anchor.web3.PublicKey(
      "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
    );

  async function createTestMint(
    decimals: number = 6
  ) {
    const mint =
      anchor.web3.Keypair.generate();

    const rent =
      await provider.connection
        .getMinimumBalanceForRentExemption(
          MINT_SIZE
        );

    const transaction =
      new anchor.web3.Transaction()
        .add(
          anchor.web3.SystemProgram
            .createAccount({
              fromPubkey:
                provider.wallet
                  .publicKey,

              newAccountPubkey:
                mint.publicKey,

              space:
                MINT_SIZE,

              lamports:
                rent,

              programId:
                TOKEN_PROGRAM_ID,
            }),

          createInitializeMint2Instruction(
            mint.publicKey,
            decimals,
            provider.wallet
              .publicKey,
            null,
            TOKEN_PROGRAM_ID
          )
        );

    await provider
      .sendAndConfirm(
        transaction,
        [mint]
      );

    return mint.publicKey;
  }

  async function createStablecoinMint() {
    return createTestMint(6);
  }

  async function getTransactionWithRetry(
    signature: string
  ) {
    let transaction = null;

    for (
      let attempt = 0;
      attempt < 10;
      attempt++
    ) {
      transaction =
        await provider.connection
          .getTransaction(
            signature,
            {
              commitment:
                "confirmed",

              maxSupportedTransactionVersion:
                0,
            }
          );

      if (transaction) {
        break;
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            500
          )
      );
    }

    if (!transaction) {
      throw new Error(
        "Transaction not found after retries"
      );
    }

    return transaction;
  }

  function deriveBasketAddresses(
    creator:
      anchor.web3.PublicKey,

    basketId:
      anchor.BN
  ) {
    const [basketPda] =
      anchor.web3.PublicKey
        .findProgramAddressSync(
          [
            Buffer.from(
              "basket"
            ),

            creator.toBuffer(),

            basketId.toArrayLike(
              Buffer,
              "le",
              8
            ),
          ],

          program.programId
        );

    const [basketMintPda] =
      anchor.web3.PublicKey
        .findProgramAddressSync(
          [
            Buffer.from(
              "basket_mint"
            ),

            basketPda
              .toBuffer(),
          ],

          program.programId
        );

    const [stablecoinVaultPda] =
      anchor.web3.PublicKey
        .findProgramAddressSync(
          [
            Buffer.from(
              "stablecoin_vault"
            ),

            basketPda
              .toBuffer(),
          ],

          program.programId
        );

    return {
      basketPda,
      basketMintPda,
      stablecoinVaultPda,
    };
  }

  function deriveConstituentVault(
    basketPda:
      anchor.web3.PublicKey,

    constituentIndex:
      number
  ) {
    const [constituentVaultPda] =
      anchor.web3.PublicKey
        .findProgramAddressSync(
          [
            Buffer.from(
              "constituent_vault"
            ),

            basketPda
              .toBuffer(),

            Buffer.from([
              constituentIndex,
            ]),
          ],

          program.programId
        );

    return constituentVaultPda;
  }

  it(
    "previews weighted basket allocations",
    async () => {
      const creator =
        provider.wallet
          .publicKey;

      const basketId =
        new anchor.BN(
          Date.now()
        );

      const stablecoinMint =
        await createStablecoinMint();

      const {
        basketPda,
        basketMintPda,
        stablecoinVaultPda,
      } =
        deriveBasketAddresses(
          creator,
          basketId
        );

      const constituents = [
        {
          mint:
            anchor.web3
              .Keypair
              .generate()
              .publicKey,

          weightBps:
            4000,
        },

        {
          mint:
            anchor.web3
              .Keypair
              .generate()
              .publicKey,

          weightBps:
            2500,
        },

        {
          mint:
            anchor.web3
              .Keypair
              .generate()
              .publicKey,

          weightBps:
            2000,
        },

        {
          mint:
            anchor.web3
              .Keypair
              .generate()
              .publicKey,

          weightBps:
            1500,
        },
      ];

      await program.methods
        .initializeBasket(
          "Preview Basket",
          basketId,
          constituents
        )
        .accounts({
          basket:
            basketPda,

          basketMint:
            basketMintPda,

          stablecoinMint,

          stablecoinVault:
            stablecoinVaultPda,

          creator,

          tokenProgram,

          systemProgram:
            anchor.web3
              .SystemProgram
              .programId,
        })
        .rpc();

      const previewAmount =
        new anchor.BN(
          5_000_000
        );

      const signature =
        await program.methods
          .previewAllocations(
            previewAmount
          )
          .accounts({
            basket:
              basketPda,
          })
          .rpc();

      const transaction =
        await getTransactionWithRetry(
          signature
        );

      const logs =
        transaction.meta
          ?.logMessages ?? [];

      console.log(
        "Preview allocation logs:"
      );

      for (
        const log of logs
      ) {
        if (
          log.includes(
            "Preview amount"
          ) ||
          log.includes(
            "target_amount"
          ) ||
          log.includes(
            "weight_bps"
          )
        ) {
          console.log(
            log
          );
        }
      }

      const expectedLogs = [
        "Constituent 0 target_amount: 2000000",
        "Constituent 1 target_amount: 1250000",
        "Constituent 2 target_amount: 1000000",
        "Constituent 3 target_amount: 750000",
      ];

      for (
        const expected of
        expectedLogs
      ) {
        const found =
          logs.some(
            (log) =>
              log.includes(
                expected
              )
          );

        if (!found) {
          throw new Error(
            `Missing expected preview log: ${expected}`
          );
        }
      }
    }
  );

  it(
    "creates a constituent vault owned by the basket PDA",
    async () => {
      const creator =
        provider.wallet
          .publicKey;

      const basketId =
        new anchor.BN(
          Date.now() + 1
        );

      const stablecoinMint =
        await createStablecoinMint();

      const constituentMint =
        await createTestMint(
          6
        );

      const {
        basketPda,
        basketMintPda,
        stablecoinVaultPda,
      } =
        deriveBasketAddresses(
          creator,
          basketId
        );

      const constituentIndex =
        0;

      const constituentVaultPda =
        deriveConstituentVault(
          basketPda,
          constituentIndex
        );

      const constituents = [
        {
          mint:
            constituentMint,

          weightBps:
            10_000,
        },
      ];

      await program.methods
        .initializeBasket(
          "Vault Test Basket",
          basketId,
          constituents
        )
        .accounts({
          basket:
            basketPda,

          basketMint:
            basketMintPda,

          stablecoinMint,

          stablecoinVault:
            stablecoinVaultPda,

          creator,

          tokenProgram,

          systemProgram:
            anchor.web3
              .SystemProgram
              .programId,
        })
        .rpc();

      await program.methods
        .initializeConstituentVault(
          constituentIndex
        )
        .accounts({
          basket:
            basketPda,

          constituentMint,

          constituentVault:
            constituentVaultPda,

          payer:
            creator,

          tokenProgram,

          systemProgram:
            anchor.web3
              .SystemProgram
              .programId,
        })
        .rpc();

      const constituentVault =
        await getAccount(
          provider.connection,
          constituentVaultPda
        );

      console.log(
        "Constituent mint:",
        constituentMint
          .toBase58()
      );

      console.log(
        "Constituent vault:",
        constituentVaultPda
          .toBase58()
      );

      console.log(
        "Constituent vault authority:",
        constituentVault
          .owner
          .toBase58()
      );

      if (
        !constituentVault
          .mint
          .equals(
            constituentMint
          )
      ) {
        throw new Error(
          "Constituent vault has the wrong mint"
        );
      }

      if (
        !constituentVault
          .owner
          .equals(
            basketPda
          )
      ) {
        throw new Error(
          "Basket PDA is not the constituent vault authority"
        );
      }

      if (
        constituentVault
          .amount !==
        0n
      ) {
        throw new Error(
          "New constituent vault should start empty"
        );
      }
    }
  );

  it(
    "prepares a constituent swap with the correct target allocation",
    async () => {
      const creator =
        provider.wallet
          .publicKey;

      const basketId =
        new anchor.BN(
          Date.now() + 2
        );

      const stablecoinMint =
        await createStablecoinMint();

      const constituentMint0 =
        await createTestMint(
          6
        );

      const constituentMint1 =
        await createTestMint(
          6
        );

      const {
        basketPda,
        basketMintPda,
        stablecoinVaultPda,
      } =
        deriveBasketAddresses(
          creator,
          basketId
        );

      const constituentIndex =
        0;

      const constituentVaultPda =
        deriveConstituentVault(
          basketPda,
          constituentIndex
        );

      const constituents = [
        {
          mint:
            constituentMint0,

          weightBps:
            4000,
        },

        {
          mint:
            constituentMint1,

          weightBps:
            6000,
        },
      ];

      await program.methods
        .initializeBasket(
          "Swap Preparation Basket",
          basketId,
          constituents
        )
        .accounts({
          basket:
            basketPda,

          basketMint:
            basketMintPda,

          stablecoinMint,

          stablecoinVault:
            stablecoinVaultPda,

          creator,

          tokenProgram,

          systemProgram:
            anchor.web3
              .SystemProgram
              .programId,
        })
        .rpc();

      await program.methods
        .initializeConstituentVault(
          constituentIndex
        )
        .accounts({
          basket:
            basketPda,

          constituentMint:
            constituentMint0,

          constituentVault:
            constituentVaultPda,

          payer:
            creator,

          tokenProgram,

          systemProgram:
            anchor.web3
              .SystemProgram
              .programId,
        })
        .rpc();

      const inputAmount =
        new anchor.BN(
          5_000_000
        );

      const signature =
        await program.methods
          .prepareConstituentSwap(
            constituentIndex,
            inputAmount
          )
          .accounts({
            basket:
              basketPda,

            stablecoinMint,

            stablecoinVault:
              stablecoinVaultPda,

            constituentMint:
              constituentMint0,

            constituentVault:
              constituentVaultPda,

            tokenProgram,
          })
          .rpc();

      const transaction =
        await getTransactionWithRetry(
          signature
        );

      const logs =
        transaction.meta
          ?.logMessages ?? [];

      console.log(
        "Swap preparation logs:"
      );

      const expectedLogs = [
        "Constituent index: 0",
        "Input amount: 5000000",
        "Constituent weight_bps: 4000",
        "Target allocation amount: 2000000",
      ];

      for (
        const expected of
        expectedLogs
      ) {
        const found =
          logs.some(
            (log) =>
              log.includes(
                expected
              )
          );

        if (!found) {
          throw new Error(
            `Missing expected swap preparation log: ${expected}`
          );
        }
      }
    }
  );

  it(
    "rejects an unknown Jupiter instruction before CPI",
    async () => {
      const creator =
        provider.wallet
          .publicKey;

      const basketId =
        new anchor.BN(
          Date.now() + 3
        );

      const stablecoinMint =
        await createStablecoinMint();

      const constituentMint =
        await createTestMint(
          6
        );

      const {
        basketPda,
        basketMintPda,
        stablecoinVaultPda,
      } =
        deriveBasketAddresses(
          creator,
          basketId
        );

      const constituentIndex =
        0;

      const constituentVaultPda =
        deriveConstituentVault(
          basketPda,
          constituentIndex
        );

      const constituents = [
        {
          mint:
            constituentMint,

          weightBps:
            10_000,
        },
      ];

      await program.methods
        .initializeBasket(
          "Invalid Jupiter Test",
          basketId,
          constituents
        )
        .accounts({
          basket:
            basketPda,

          basketMint:
            basketMintPda,

          stablecoinMint,

          stablecoinVault:
            stablecoinVaultPda,

          creator,

          tokenProgram,

          systemProgram:
            anchor.web3
              .SystemProgram
              .programId,
        })
        .rpc();

      await program.methods
        .initializeConstituentVault(
          constituentIndex
        )
        .accounts({
          basket:
            basketPda,

          constituentMint,

          constituentVault:
            constituentVaultPda,

          payer:
            creator,

          tokenProgram,

          systemProgram:
            anchor.web3
              .SystemProgram
              .programId,
        })
        .rpc();

      const userStablecoinAccount =
        getAssociatedTokenAddressSync(
          stablecoinMint,
          creator
        );

      const createUserStablecoinAccountTx =
        new anchor.web3
          .Transaction()
          .add(
            createAssociatedTokenAccountInstruction(
              creator,
              userStablecoinAccount,
              creator,
              stablecoinMint
            )
          );

      await provider
        .sendAndConfirm(
          createUserStablecoinAccountTx
        );

      const fiveUsdc =
        5_000_000n;

      const mintStablecoinsTx =
        new anchor.web3
          .Transaction()
          .add(
            createMintToInstruction(
              stablecoinMint,
              userStablecoinAccount,
              creator,
              fiveUsdc
            )
          );

      await provider
        .sendAndConfirm(
          mintStablecoinsTx
        );

      const userBasketTokenAccount =
        getAssociatedTokenAddressSync(
          basketMintPda,
          creator
        );

      const createBasketTokenAccountTx =
        new anchor.web3
          .Transaction()
          .add(
            createAssociatedTokenAccountInstruction(
              creator,
              userBasketTokenAccount,
              creator,
              basketMintPda
            )
          );

      await provider
        .sendAndConfirm(
          createBasketTokenAccountTx
        );

      await program.methods
        .depositAndMint(
          new anchor.BN(
            5_000_000
          )
        )
        .accounts({
          basket:
            basketPda,

          basketMint:
            basketMintPda,

          stablecoinMint,

          userStablecoinAccount,

          stablecoinVault:
            stablecoinVaultPda,

          userBasketTokenAccount,

          user:
            creator,

          tokenProgram,
        })
        .rpc();

      const invalidJupiterData =
        Buffer.from([
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
        ]);

      try {
        await program.methods
          .executeConstituentSwap(
            constituentIndex,

            new anchor.BN(
              2_000_000
            ),

            new anchor.BN(
              1
            ),

            invalidJupiterData
          )
          .accounts({
            basket:
              basketPda,

            stablecoinMint,

            stablecoinVault:
              stablecoinVaultPda,

            constituentMint,

            constituentVault:
              constituentVaultPda,

            jupiterProgram:
              JUPITER_SWAP_PROGRAM_ID,

            tokenProgram,
          })
          .rpc();

        throw new Error(
          "Expected invalid Jupiter instruction to fail"
        );
      } catch (
        error: any
      ) {
        const errorText =
          error.toString();

        console.log(
          "Invalid Jupiter instruction rejected:"
        );

        console.log(
          errorText
        );

        if (
          !errorText.includes(
            "Jupiter instruction type is not allowed"
          )
        ) {
          throw error;
        }
      }

      const stablecoinVault =
        await getAccount(
          provider.connection,
          stablecoinVaultPda
        );

      const constituentVault =
        await getAccount(
          provider.connection,
          constituentVaultPda
        );

      /*
       * The fake instruction must have been
       * rejected BEFORE any CPI happened.
       */

      if (
        stablecoinVault
          .amount !==
        5_000_000n
      ) {
        throw new Error(
          "Stablecoin vault changed after rejected Jupiter instruction"
        );
      }

      if (
        constituentVault
          .amount !==
        0n
      ) {
        throw new Error(
          "Constituent vault changed after rejected Jupiter instruction"
        );
      }
    }
  );

  it(
    "deposits, mints shares, redeems shares, and withdraws stablecoin",
    async () => {
      const creator =
        provider.wallet
          .publicKey;

      const basketId =
        new anchor.BN(
          Date.now() + 4
        );

      const stablecoinMint =
        await createStablecoinMint();

      const {
        basketPda,
        basketMintPda,
        stablecoinVaultPda,
      } =
        deriveBasketAddresses(
          creator,
          basketId
        );

      const constituents = [
        {
          mint:
            anchor.web3
              .Keypair
              .generate()
              .publicKey,

          weightBps:
            4000,
        },

        {
          mint:
            anchor.web3
              .Keypair
              .generate()
              .publicKey,

          weightBps:
            2500,
        },

        {
          mint:
            anchor.web3
              .Keypair
              .generate()
              .publicKey,

          weightBps:
            2000,
        },

        {
          mint:
            anchor.web3
              .Keypair
              .generate()
              .publicKey,

          weightBps:
            1500,
        },
      ];

      await program.methods
        .initializeBasket(
          "AI Basket",
          basketId,
          constituents
        )
        .accounts({
          basket:
            basketPda,

          basketMint:
            basketMintPda,

          stablecoinMint,

          stablecoinVault:
            stablecoinVaultPda,

          creator,

          tokenProgram,

          systemProgram:
            anchor.web3
              .SystemProgram
              .programId,
        })
        .rpc();

      const basketAccount =
        await program
          .account
          .basket
          .fetch(
            basketPda
          );

      const mintInfo =
        await getMint(
          provider.connection,
          basketMintPda
        );

      if (
        !basketAccount
          .basketMint
          .equals(
            basketMintPda
          )
      ) {
        throw new Error(
          "Basket mint PDA was not stored correctly"
        );
      }

      if (
        !basketAccount
          .stablecoinMint
          .equals(
            stablecoinMint
          )
      ) {
        throw new Error(
          "Stablecoin mint was not stored correctly"
        );
      }

      if (
        !basketAccount
          .stablecoinVault
          .equals(
            stablecoinVaultPda
          )
      ) {
        throw new Error(
          "Stablecoin vault was not stored correctly"
        );
      }

      if (
        mintInfo.decimals !==
        6
      ) {
        throw new Error(
          "Basket mint does not have 6 decimals"
        );
      }

      if (
        !mintInfo.mintAuthority ||
        !mintInfo
          .mintAuthority
          .equals(
            basketPda
          )
      ) {
        throw new Error(
          "Basket PDA is not the mint authority"
        );
      }

      const userStablecoinAccount =
        getAssociatedTokenAddressSync(
          stablecoinMint,
          creator
        );

      const createUserStablecoinAccountTx =
        new anchor.web3
          .Transaction()
          .add(
            createAssociatedTokenAccountInstruction(
              creator,
              userStablecoinAccount,
              creator,
              stablecoinMint
            )
          );

      await provider
        .sendAndConfirm(
          createUserStablecoinAccountTx
        );

      const tenUsdc =
        10_000_000n;

      const mintStablecoinsTx =
        new anchor.web3
          .Transaction()
          .add(
            createMintToInstruction(
              stablecoinMint,
              userStablecoinAccount,
              creator,
              tenUsdc
            )
          );

      await provider
        .sendAndConfirm(
          mintStablecoinsTx
        );

      const userBasketTokenAccount =
        getAssociatedTokenAddressSync(
          basketMintPda,
          creator
        );

      const createBasketTokenAccountTx =
        new anchor.web3
          .Transaction()
          .add(
            createAssociatedTokenAccountInstruction(
              creator,
              userBasketTokenAccount,
              creator,
              basketMintPda
            )
          );

      await provider
        .sendAndConfirm(
          createBasketTokenAccountTx
        );

      const userBefore =
        await getAccount(
          provider.connection,
          userStablecoinAccount
        );

      const vaultBefore =
        await getAccount(
          provider.connection,
          stablecoinVaultPda
        );

      const sharesBefore =
        await getAccount(
          provider.connection,
          userBasketTokenAccount
        );

      console.log(
        "User stablecoin before:",
        userBefore
          .amount
          .toString()
      );

      console.log(
        "Vault before:",
        vaultBefore
          .amount
          .toString()
      );

      console.log(
        "Basket shares before:",
        sharesBefore
          .amount
          .toString()
      );

      const fiveUsdc =
        new anchor.BN(
          5_000_000
        );

      await program.methods
        .depositAndMint(
          fiveUsdc
        )
        .accounts({
          basket:
            basketPda,

          basketMint:
            basketMintPda,

          stablecoinMint,

          userStablecoinAccount,

          stablecoinVault:
            stablecoinVaultPda,

          userBasketTokenAccount,

          user:
            creator,

          tokenProgram,
        })
        .rpc();

      const userAfterDeposit =
        await getAccount(
          provider.connection,
          userStablecoinAccount
        );

      const vaultAfterDeposit =
        await getAccount(
          provider.connection,
          stablecoinVaultPda
        );

      const sharesAfterDeposit =
        await getAccount(
          provider.connection,
          userBasketTokenAccount
        );

      console.log(
        "User stablecoin after deposit:",
        userAfterDeposit
          .amount
          .toString()
      );

      console.log(
        "Vault after deposit:",
        vaultAfterDeposit
          .amount
          .toString()
      );

      console.log(
        "Basket shares after deposit:",
        sharesAfterDeposit
          .amount
          .toString()
      );

      if (
        userAfterDeposit
          .amount !==
        5_000_000n
      ) {
        throw new Error(
          "User should have 5 USDC after deposit"
        );
      }

      if (
        vaultAfterDeposit
          .amount !==
        5_000_000n
      ) {
        throw new Error(
          "Vault should contain 5 USDC after deposit"
        );
      }

      if (
        sharesAfterDeposit
          .amount !==
        5_000_000n
      ) {
        throw new Error(
          "User should have 5 basket shares after deposit"
        );
      }

      const twoShares =
        new anchor.BN(
          2_000_000
        );

      await program.methods
        .redeemAndWithdraw(
          twoShares
        )
        .accounts({
          basket:
            basketPda,

          basketMint:
            basketMintPda,

          stablecoinMint,

          userBasketTokenAccount,

          stablecoinVault:
            stablecoinVaultPda,

          userStablecoinAccount,

          user:
            creator,

          tokenProgram,
        })
        .rpc();

      const userAfterRedeem =
        await getAccount(
          provider.connection,
          userStablecoinAccount
        );

      const vaultAfterRedeem =
        await getAccount(
          provider.connection,
          stablecoinVaultPda
        );

      const sharesAfterRedeem =
        await getAccount(
          provider.connection,
          userBasketTokenAccount
        );

      console.log(
        "User stablecoin after redeem:",
        userAfterRedeem
          .amount
          .toString()
      );

      console.log(
        "Vault after redeem:",
        vaultAfterRedeem
          .amount
          .toString()
      );

      console.log(
        "Basket shares after redeem:",
        sharesAfterRedeem
          .amount
          .toString()
      );

      if (
        userAfterRedeem
          .amount !==
        7_000_000n
      ) {
        throw new Error(
          "User should have 7 USDC after redeem"
        );
      }

      if (
        vaultAfterRedeem
          .amount !==
        3_000_000n
      ) {
        throw new Error(
          "Vault should contain 3 USDC after redeem"
        );
      }

      if (
        sharesAfterRedeem
          .amount !==
        3_000_000n
      ) {
        throw new Error(
          "User should have 3 basket shares after redeem"
        );
      }
    }
  );

  it(
    "rejects invalid basket weights",
    async () => {
      const creator =
        provider.wallet
          .publicKey;

      const basketId =
        new anchor.BN(
          Date.now() + 5
        );

      const stablecoinMint =
        await createStablecoinMint();

      const {
        basketPda,
        basketMintPda,
        stablecoinVaultPda,
      } =
        deriveBasketAddresses(
          creator,
          basketId
        );

      const invalidConstituents = [
        {
          mint:
            anchor.web3
              .Keypair
              .generate()
              .publicKey,

          weightBps:
            5000,
        },

        {
          mint:
            anchor.web3
              .Keypair
              .generate()
              .publicKey,

          weightBps:
            4000,
        },
      ];

      try {
        await program.methods
          .initializeBasket(
            "Invalid Basket",
            basketId,
            invalidConstituents
          )
          .accounts({
            basket:
              basketPda,

            basketMint:
              basketMintPda,

            stablecoinMint,

            stablecoinVault:
              stablecoinVaultPda,

            creator,

            tokenProgram,

            systemProgram:
              anchor.web3
                .SystemProgram
                .programId,
          })
          .rpc();

        throw new Error(
          "Expected transaction to fail"
        );
      } catch (
        error: any
      ) {
        if (
          !error
            .toString()
            .includes(
              "Constituent weights must add up to 10,000 basis points"
            )
        ) {
          throw error;
        }
      }
    }
  );

  it(
    "rejects more than 10 constituents",
    async () => {
      const creator =
        provider.wallet
          .publicKey;

      const basketId =
        new anchor.BN(
          Date.now() + 6
        );

      const stablecoinMint =
        await createStablecoinMint();

      const {
        basketPda,
        basketMintPda,
        stablecoinVaultPda,
      } =
        deriveBasketAddresses(
          creator,
          basketId
        );

      const tooManyConstituents =
        Array.from(
          {
            length:
              11,
          },

          () => ({
            mint:
              anchor.web3
                .Keypair
                .generate()
                .publicKey,

            weightBps:
              1000,
          })
        );

      try {
        await program.methods
          .initializeBasket(
            "Too Many Constituents",
            basketId,
            tooManyConstituents
          )
          .accounts({
            basket:
              basketPda,

            basketMint:
              basketMintPda,

            stablecoinMint,

            stablecoinVault:
              stablecoinVaultPda,

            creator,

            tokenProgram,

            systemProgram:
              anchor.web3
                .SystemProgram
                .programId,
          })
          .rpc();

        throw new Error(
          "Expected transaction to fail"
        );
      } catch (
        error: any
      ) {
        if (
          !error
            .toString()
            .includes(
              "Basket cannot contain more than 10 constituents"
            )
        ) {
          throw error;
        }
      }
    }
  );
});