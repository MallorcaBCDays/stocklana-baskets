import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import fs from "fs";

const JUPITER_BUILD_URL =
  "https://api.jup.ag/swap/v2/build";

const JUPITER_SWAP_PROGRAM_ID =
  new PublicKey(
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
  );

const WSOL_MINT =
  new PublicKey(
    "So11111111111111111111111111111111111111112"
  );

const USDC_MINT =
  new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );

/*
 * Keep this conservative so the OUTER Stocklana
 * transaction has a chance to fit without ALTs.
 */
const MAX_JUPITER_ACCOUNTS = 24;

/*
 * 0.01 SOL in lamports.
 */
const INPUT_AMOUNT = 10_000_000n;

/*
 * Fixed test basket ID so PLAN and EXECUTE derive
 * exactly the same PDAs across validator restarts.
 */
const E2E_BASKET_ID =
  new anchor.BN("900000000001");

const CONSTITUENT_INDEX = 0;

const PLAN_FILE =
  "scripts/jupiter-e2e-plan.json";

type JupiterAccount = {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
};

type JupiterSwapInstruction = {
  programId: string;
  accounts: JupiterAccount[];
  data: string;
};

type JupiterBuildResponse = {
  inAmount?: string;
  outAmount?: string;
  otherAmountThreshold?: string;
  swapMode?: string;

  routePlan?: Array<{
    swapInfo?: {
      ammKey?: string;
      label?: string;
      inputMint?: string;
      outputMint?: string;
      inAmount?: string;
      outAmount?: string;
    };
    percent?: number;
    bps?: number;
  }>;

  swapInstruction?: JupiterSwapInstruction;
  setupInstructions?: JupiterSwapInstruction[];
  cleanupInstruction?: JupiterSwapInstruction | null;
  otherInstructions?: JupiterSwapInstruction[];

  error?: string;
  errorMessage?: string;
};

type SavedPlan = {
  basketId: string;
  inputAmount: string;
  result: JupiterBuildResponse;
};

function deriveBasketAddresses(
  programId: PublicKey,
  creator: PublicKey,
  basketId: anchor.BN
) {
  const basketIdBuffer =
    basketId.toArrayLike(
      Buffer,
      "le",
      8
    );

  const [basketPda] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("basket"),
        creator.toBuffer(),
        basketIdBuffer,
      ],
      programId
    );

  const [basketMintPda] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("basket_mint"),
        basketPda.toBuffer(),
      ],
      programId
    );

  const [stablecoinVaultPda] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("stablecoin_vault"),
        basketPda.toBuffer(),
      ],
      programId
    );

  return {
    basketPda,
    basketMintPda,
    stablecoinVaultPda,
  };
}

function deriveConstituentVault(
  programId: PublicKey,
  basketPda: PublicKey,
  index: number
) {
  const [constituentVaultPda] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("constituent_vault"),
        basketPda.toBuffer(),
        Buffer.from([index]),
      ],
      programId
    );

  return constituentVaultPda;
}

async function getJupiterBuild(
  taker: PublicKey,
  payer: PublicKey,
  destinationTokenAccount: PublicKey
): Promise<JupiterBuildResponse> {
  const params =
    new URLSearchParams({
      inputMint:
        WSOL_MINT.toBase58(),

      outputMint:
        USDC_MINT.toBase58(),

      amount:
        INPUT_AMOUNT.toString(),

      taker:
        taker.toBase58(),

      payer:
        payer.toBase58(),

      /*
       * Stocklana manages WSOL itself. This is critical:
       * Jupiter must NOT try to wrap native SOL using the
       * Basket PDA as the payer/signer.
       */
      wrapAndUnwrapSol:
        "false",

      destinationTokenAccount:
        destinationTokenAccount.toBase58(),

      /*
       * Quantum currently reaches its on-chain program on
       * localnet but fails on cloned mainnet state (0x9).
       * Exclude it for this local E2E harness so Jupiter
       * can choose a route that is more practical to clone.
       */
      excludeDexes:
        "Quantum",

      maxAccounts:
        MAX_JUPITER_ACCOUNTS.toString(),
    });

  const url =
    `${JUPITER_BUILD_URL}?${params.toString()}`;

  const headers:
    Record<string, string> = {};

  if (process.env.JUPITER_API_KEY) {
    headers["x-api-key"] =
      process.env.JUPITER_API_KEY;
  }

  const response =
    await fetch(
      url,
      {
        method: "GET",
        headers,
      }
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Jupiter /build failed (${response.status}): ${text}`
    );
  }

  const result =
    JSON.parse(
      text
    ) as JupiterBuildResponse;

  if (
    result.error ||
    result.errorMessage
  ) {
    throw new Error(
      `Jupiter error: ${
        result.errorMessage ??
        result.error
      }`
    );
  }

  if (!result.swapInstruction) {
    throw new Error(
      "Jupiter response has no swapInstruction"
    );
  }

  if (
    result.swapInstruction.programId !==
    JUPITER_SWAP_PROGRAM_ID.toBase58()
  ) {
    throw new Error(
      `Unexpected Jupiter program: ${result.swapInstruction.programId}`
    );
  }

  return result;
}

function getContext() {
  const provider =
    anchor.AnchorProvider.env();

  anchor.setProvider(
    provider
  );

  const program =
    anchor.workspace
      .BasketVault as anchor.Program;

  const creator =
    provider.wallet.publicKey;

  const {
    basketPda,
    basketMintPda,
    stablecoinVaultPda,
  } =
    deriveBasketAddresses(
      program.programId,
      creator,
      E2E_BASKET_ID
    );

  const constituentVaultPda =
    deriveConstituentVault(
      program.programId,
      basketPda,
      CONSTITUENT_INDEX
    );

  const basketStablecoinAta =
    getAssociatedTokenAddressSync(
      WSOL_MINT,
      basketPda,
      true
    );

  const userWsolAta =
    getAssociatedTokenAddressSync(
      WSOL_MINT,
      creator
    );

  return {
    provider,
    program,
    creator,
    basketPda,
    basketMintPda,
    stablecoinVaultPda,
    constituentVaultPda,
    basketStablecoinAta,
    userWsolAta,
  };
}

async function plan() {
  const {
    program,
    creator,
    basketPda,
    basketMintPda,
    stablecoinVaultPda,
    constituentVaultPda,
    basketStablecoinAta,
  } =
    getContext();

  console.log(
    "Stocklana Jupiter E2E PLAN"
  );

  console.log(
    "Program:",
    program.programId.toBase58()
  );

  console.log(
    "Wallet:",
    creator.toBase58()
  );

  console.log(
    "Basket PDA:",
    basketPda.toBase58()
  );

  console.log(
    "Basket mint:",
    basketMintPda.toBase58()
  );

  console.log(
    "Internal WSOL vault:",
    stablecoinVaultPda.toBase58()
  );

  console.log(
    "Basket WSOL ATA:",
    basketStablecoinAta.toBase58()
  );

  console.log(
    "USDC constituent vault:",
    constituentVaultPda.toBase58()
  );

  console.log("");
  console.log(
    "Requesting Jupiter WSOL -> USDC route..."
  );

  console.log(
    "Excluded DEXes: Quantum"
  );

  const result =
    await getJupiterBuild(
      basketPda,
      creator,
      constituentVaultPda
    );

  const swapInstruction =
    result.swapInstruction!;

  console.log(
    "Input amount:",
    result.inAmount ??
      INPUT_AMOUNT.toString()
  );

  console.log(
    "Expected output:",
    result.outAmount ??
      "unknown"
  );

  console.log(
    "Minimum output:",
    result.otherAmountThreshold ??
      "unknown"
  );

  console.log(
    "Remaining account count:",
    swapInstruction.accounts.length
  );

  console.log(
    "Configured maxAccounts:",
    MAX_JUPITER_ACCOUNTS
  );

  console.log("");
  console.log("Route:");

  if (
    result.routePlan &&
    result.routePlan.length > 0
  ) {
    result.routePlan.forEach(
      (step, index) => {
        console.log(
          `${index}: ${
            step.swapInfo?.label ??
            step.swapInfo?.ammKey ??
            "unknown"
          }`
        );
      }
    );
  }

  const sourcePresent =
    swapInstruction.accounts.some(
      (account) =>
        account.pubkey ===
        basketStablecoinAta.toBase58()
    );

  const destinationPresent =
    swapInstruction.accounts.some(
      (account) =>
        account.pubkey ===
        constituentVaultPda.toBase58()
    );

  console.log("");
  console.log(
    "SOURCE CHECK:",
    sourcePresent
      ? "PASS"
      : "FAIL"
  );

  console.log(
    "DESTINATION CHECK:",
    destinationPresent
      ? "PASS"
      : "FAIL"
  );

  if (
    !sourcePresent ||
    !destinationPresent
  ) {
    throw new Error(
      "Jupiter source/destination account check failed"
    );
  }

  const setupInstructions =
    result.setupInstructions ?? [];

  console.log(
    "Setup instruction count:",
    setupInstructions.length
  );

  console.log(
    "Cleanup instruction:",
    result.cleanupInstruction
      ? "present"
      : "none"
  );

  const basketSignedSetup =
    setupInstructions.filter(
      (instruction) =>
        instruction.accounts.some(
          (account) =>
            account.pubkey === basketPda.toBase58() &&
            account.isSigner
        )
    );

  if (basketSignedSetup.length > 0) {
    throw new Error(
      "Jupiter still requires the Basket PDA to sign a setup instruction. " +
      "wrapAndUnwrapSol=false/payer override did not remove the incompatible setup path."
    );
  }

  const savedPlan:
    SavedPlan = {
      basketId:
        E2E_BASKET_ID.toString(),

      inputAmount:
        INPUT_AMOUNT.toString(),

      result,
    };

  fs.writeFileSync(
    PLAN_FILE,
    JSON.stringify(
      savedPlan,
      null,
      2
    )
  );

  console.log("");
  console.log(
    `Plan saved: ${PLAN_FILE}`
  );

  console.log("");
  console.log(
    "ALL JUPITER ACCOUNTS:"
  );

  swapInstruction.accounts.forEach(
    (account, index) => {
      console.log(
        `${index}: ${account.pubkey} writable=${account.isWritable} signer=${account.isSigner}`
      );
    }
  );

  console.log("");
  console.log(
    "PLAN COMPLETE - no transaction sent."
  );
}

function deserializeInstruction(
  instruction: JupiterSwapInstruction
): TransactionInstruction {
  return new TransactionInstruction({
    programId:
      new PublicKey(
        instruction.programId
      ),

    keys:
      instruction.accounts.map(
        (account) => ({
          pubkey:
            new PublicKey(
              account.pubkey
            ),

          isSigner:
            account.isSigner,

          isWritable:
            account.isWritable,
        })
      ),

    data:
      Buffer.from(
        instruction.data,
        "base64"
      ),
  });
}

async function accountExists(
  provider: anchor.AnchorProvider,
  address: PublicKey
) {
  return (
    await provider.connection
      .getAccountInfo(address)
  ) !== null;
}

async function execute() {
  const {
    provider,
    program,
    creator,
    basketPda,
    basketMintPda,
    stablecoinVaultPda,
    constituentVaultPda,
    basketStablecoinAta,
    userWsolAta,
  } =
    getContext();

  if (
    !fs.existsSync(
      PLAN_FILE
    )
  ) {
    throw new Error(
      `Missing ${PLAN_FILE}. Run MODE=plan first.`
    );
  }

  const savedPlan =
    JSON.parse(
      fs.readFileSync(
        PLAN_FILE,
        "utf8"
      )
    ) as SavedPlan;

  if (
    savedPlan.basketId !==
    E2E_BASKET_ID.toString()
  ) {
    throw new Error(
      "Saved basket ID does not match this script"
    );
  }

  if (
    savedPlan.inputAmount !==
    INPUT_AMOUNT.toString()
  ) {
    throw new Error(
      "Saved input amount does not match this script"
    );
  }

  const result =
    savedPlan.result;

  if (
    !result.swapInstruction ||
    !result.otherAmountThreshold
  ) {
    throw new Error(
      "Saved Jupiter plan is incomplete"
    );
  }

  const swapInstruction =
    result.swapInstruction;

  const jupiterInstructionData =
    Buffer.from(
      swapInstruction.data,
      "base64"
    );

  const remainingAccounts =
    swapInstruction.accounts.map(
      (account) => {
        const pubkey =
          new PublicKey(
            account.pubkey
          );

        /*
         * Jupiter marks the taker (our Basket PDA)
         * as a signer for the INNER Jupiter instruction.
         *
         * The Basket PDA must NOT be a signer on the
         * OUTER Stocklana transaction because a PDA has
         * no private key. Rust promotes this account to
         * signer for the CPI and invoke_signed() supplies
         * the PDA signature at the correct inner level.
         */
        const isBasketPda =
          pubkey.equals(
            basketPda
          );

        return {
          pubkey,

          isWritable:
            account.isWritable,

          isSigner:
            isBasketPda
              ? false
              : account.isSigner,
        };
      }
    );

  const unexpectedOuterSigners =
    remainingAccounts.filter(
      (account) =>
        account.isSigner &&
        !account.pubkey.equals(
          creator
        )
    );

  if (
    unexpectedOuterSigners.length > 0
  ) {
    throw new Error(
      `Unexpected Jupiter outer signer(s): ${
        unexpectedOuterSigners
          .map(
            (account) =>
              account.pubkey.toBase58()
          )
          .join(", ")
      }`
    );
  }

  console.log(
    "Stocklana Jupiter E2E EXECUTE"
  );

  console.log(
    "RPC:",
    provider.connection.rpcEndpoint
  );

  /*
   * 1. Create the basket.
   *
   * For this integration test WSOL is used as the
   * input/stablecoin mint solely because we can fund
   * WSOL locally from native SOL without possessing
   * the mainnet USDC mint authority.
   */
  if (
    !(await accountExists(
      provider,
      basketPda
    ))
  ) {
    await program.methods
      .initializeBasket(
        "Jupiter E2E Basket",
        E2E_BASKET_ID,
        [
          {
            mint:
              USDC_MINT,

            weightBps:
              10_000,
          },
        ]
      )
      .accounts({
        basket:
          basketPda,

        basketMint:
          basketMintPda,

        stablecoinMint:
          WSOL_MINT,

        stablecoinVault:
          stablecoinVaultPda,

        creator,

        tokenProgram:
          TOKEN_PROGRAM_ID,

        systemProgram:
          SystemProgram.programId,
      })
      .rpc();

    console.log(
      "Basket initialized."
    );
  } else {
    console.log(
      "Basket already exists - reusing."
    );
  }

  /*
   * 2. Create the USDC constituent vault.
   */
  if (
    !(await accountExists(
      provider,
      constituentVaultPda
    ))
  ) {
    await program.methods
      .initializeConstituentVault(
        CONSTITUENT_INDEX
      )
      .accounts({
        basket:
          basketPda,

        constituentMint:
          USDC_MINT,

        constituentVault:
          constituentVaultPda,

        payer:
          creator,

        tokenProgram:
          TOKEN_PROGRAM_ID,

        systemProgram:
          SystemProgram.programId,
      })
      .rpc();

    console.log(
      "Constituent vault initialized."
    );
  } else {
    console.log(
      "Constituent vault already exists - reusing."
    );
  }

  /*
   * 3. Create the Basket PDA's normal WSOL ATA.
   *    Jupiter uses this account as its source.
   */
  if (
    !(await accountExists(
      provider,
      basketStablecoinAta
    ))
  ) {
    const createBasketAtaTx =
      new Transaction().add(
        createAssociatedTokenAccountInstruction(
          creator,
          basketStablecoinAta,
          basketPda,
          WSOL_MINT,
          TOKEN_PROGRAM_ID
        )
      );

    await provider
      .sendAndConfirm(
        createBasketAtaTx
      );

    console.log(
      "Basket WSOL ATA created."
    );
  } else {
    console.log(
      "Basket WSOL ATA already exists - reusing."
    );
  }

  /*
   * 4. Create and fund the user's WSOL ATA.
   */
  if (
    !(await accountExists(
      provider,
      userWsolAta
    ))
  ) {
    const createAndFundUserWsolTx =
      new Transaction()
        .add(
          createAssociatedTokenAccountInstruction(
            creator,
            userWsolAta,
            creator,
            WSOL_MINT,
            TOKEN_PROGRAM_ID
          )
        )
        .add(
          SystemProgram.transfer({
            fromPubkey:
              creator,

            toPubkey:
              userWsolAta,

            lamports:
              Number(
                INPUT_AMOUNT
              ),
          })
        )
        .add(
          createSyncNativeInstruction(
            userWsolAta,
            TOKEN_PROGRAM_ID
          )
        );

    await provider
      .sendAndConfirm(
        createAndFundUserWsolTx
      );

    console.log(
      "User WSOL ATA created and funded."
    );
  } else {
    const existingUserWsol =
      await getAccount(
        provider.connection,
        userWsolAta
      );

    if (
      existingUserWsol.amount <
      INPUT_AMOUNT
    ) {
      const missing =
        INPUT_AMOUNT -
        existingUserWsol.amount;

      const topUpTx =
        new Transaction()
          .add(
            SystemProgram.transfer({
              fromPubkey:
                creator,

              toPubkey:
                userWsolAta,

              lamports:
                Number(
                  missing
                ),
            })
          )
          .add(
            createSyncNativeInstruction(
              userWsolAta,
              TOKEN_PROGRAM_ID
            )
          );

      await provider
        .sendAndConfirm(
          topUpTx
        );
    }

    console.log(
      "User WSOL ATA ready."
    );
  }

  /*
   * 5. Fund Stocklana's internal WSOL vault directly.
   *
   * We deliberately do not call deposit_and_mint here:
   * basket shares are fixed at 6 decimals while WSOL has
   * 9 decimals, and the existing MVP deposit instruction
   * correctly rejects that decimal mismatch.
   */
  const internalCurrent =
    await getAccount(
      provider.connection,
      stablecoinVaultPda
    );

  if (
    internalCurrent.amount <
    INPUT_AMOUNT
  ) {
    const missing =
      INPUT_AMOUNT -
      internalCurrent.amount;

    const fundInternalVaultTx =
      new Transaction().add(
        createTransferCheckedInstruction(
          userWsolAta,
          WSOL_MINT,
          stablecoinVaultPda,
          creator,
          missing,
          9,
          [],
          TOKEN_PROGRAM_ID
        )
      );

    await provider
      .sendAndConfirm(
        fundInternalVaultTx
      );
  }

  const internalBefore =
    await getAccount(
      provider.connection,
      stablecoinVaultPda
    );

  const basketSourceBefore =
    await getAccount(
      provider.connection,
      basketStablecoinAta
    );

  const constituentBefore =
    await getAccount(
      provider.connection,
      constituentVaultPda
    );

  console.log(
    "Internal WSOL before:",
    internalBefore.amount.toString()
  );

  console.log(
    "Basket WSOL ATA before:",
    basketSourceBefore.amount.toString()
  );

  console.log(
    "USDC constituent before:",
    constituentBefore.amount.toString()
  );

  /*
   * 6. Execute any Jupiter setup instructions.
   *
   * Because /build is requested with:
   *   payer = creator
   *   wrapAndUnwrapSol = false
   *
   * these setup instructions must not require the Basket
   * PDA as an OUTER signer. If Jupiter ever returns such
   * an instruction, abort instead of creating an invalid
   * transaction.
   */
  const setupInstructions =
    result.setupInstructions ?? [];

  for (
    let index = 0;
    index < setupInstructions.length;
    index++
  ) {
    const setup =
      setupInstructions[index];

    const basketSignerRequired =
      setup.accounts.some(
        (account) =>
          account.pubkey ===
            basketPda.toBase58() &&
          account.isSigner
      );

    if (basketSignerRequired) {
      throw new Error(
        `Setup instruction ${index} requires Basket PDA outer signature`
      );
    }

    const setupTx =
      new Transaction().add(
        deserializeInstruction(
          setup
        )
      );

    await provider
      .sendAndConfirm(
        setupTx
      );

    console.log(
      `Jupiter setup ${index} executed.`
    );
  }

  /*
   * 7. REAL Stocklana -> Jupiter CPI.
   */
  const signature =
    await program.methods
      .executeConstituentSwap(
        CONSTITUENT_INDEX,

        new anchor.BN(
          INPUT_AMOUNT.toString()
        ),

        new anchor.BN(
          result.otherAmountThreshold
        ),

        jupiterInstructionData
      )
      .accounts({
        basket:
          basketPda,

        stablecoinMint:
          WSOL_MINT,

        stablecoinVault:
          stablecoinVaultPda,

        basketStablecoinAta:
          basketStablecoinAta,

        constituentMint:
          USDC_MINT,

        constituentVault:
          constituentVaultPda,

        jupiterProgram:
          JUPITER_SWAP_PROGRAM_ID,

        tokenProgram:
          TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(
        remainingAccounts
      )
      .rpc();

  console.log(
    "REAL CPI TRANSACTION:",
    signature
  );

  const internalAfter =
    await getAccount(
      provider.connection,
      stablecoinVaultPda
    );

  const basketSourceAfter =
    await getAccount(
      provider.connection,
      basketStablecoinAta
    );

  const constituentAfter =
    await getAccount(
      provider.connection,
      constituentVaultPda
    );

  console.log(
    "Internal WSOL after:",
    internalAfter.amount.toString()
  );

  console.log(
    "Basket WSOL ATA after:",
    basketSourceAfter.amount.toString()
  );

  console.log(
    "USDC constituent after:",
    constituentAfter.amount.toString()
  );

  if (
    constituentAfter.amount <=
    constituentBefore.amount
  ) {
    throw new Error(
      "E2E failed: constituent vault did not receive USDC"
    );
  }

  if (
    basketSourceAfter.amount !==
    basketSourceBefore.amount
  ) {
    throw new Error(
      "E2E failed: Basket WSOL ATA was not restored to its starting balance"
    );
  }

  if (
    internalAfter.amount >=
    internalBefore.amount
  ) {
    throw new Error(
      "E2E failed: internal WSOL vault did not spend input"
    );
  }

  /*
   * 8. Execute optional Jupiter cleanup if it does not
   * require the Basket PDA as an outer signer.
   */
  if (result.cleanupInstruction) {
    const cleanupInstruction =
      result.cleanupInstruction;

    const basketSignerRequired =
      cleanupInstruction.accounts.some(
        (account) =>
          account.pubkey ===
            basketPda.toBase58() &&
          account.isSigner
      );

    if (basketSignerRequired) {
      throw new Error(
        "Cleanup instruction requires Basket PDA outer signature"
      );
    }

    const cleanupTx =
      new Transaction().add(
        deserializeInstruction(
          cleanupInstruction
        )
      );

    await provider
      .sendAndConfirm(
        cleanupTx
      );

    console.log(
      "Jupiter cleanup executed."
    );
  }

  console.log("");
  console.log(
    "E2E RESULT: PASS"
  );
}

async function main() {
  const mode =
    process.env.MODE ??
    "plan";

  if (mode === "plan") {
    await plan();
    return;
  }

  if (mode === "execute") {
    await execute();
    return;
  }

  throw new Error(
    `Unknown MODE=${mode}. Use MODE=plan or MODE=execute.`
  );
}

main().catch(
  (error) => {
    console.error("");
    console.error(
      "Stocklana Jupiter E2E failed:"
    );
    console.error(error);
    process.exit(1);
  }
);
