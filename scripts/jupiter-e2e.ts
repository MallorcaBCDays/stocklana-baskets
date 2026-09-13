import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Transaction,
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

      destinationTokenAccount:
        destinationTokenAccount.toBase58(),

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

  const result =
    await getJupiterBuild(
      basketPda,
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
      (account) => ({
        pubkey:
          new PublicKey(
            account.pubkey
          ),

        isWritable:
          account.isWritable,

        isSigner:
          account.isSigner,
      })
    );

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

  /*
   * 2. Create the USDC constituent vault.
   */
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

  /*
   * 3. Create the Basket PDA's normal WSOL ATA.
   *    Jupiter uses this account as its source.
   */
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

  /*
   * 4. Create and fund the user's WSOL ATA.
   */
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
    "User WSOL funded."
  );

  /*
   * 5. Fund Stocklana's internal WSOL vault directly.
   *
   * We deliberately do not call deposit_and_mint here:
   * basket shares are fixed at 6 decimals while WSOL has
   * 9 decimals, and the existing MVP deposit instruction
   * correctly rejects that decimal mismatch.
   */
  const fundInternalVaultTx =
    new Transaction().add(
      createTransferCheckedInstruction(
        userWsolAta,
        WSOL_MINT,
        stablecoinVaultPda,
        creator,
        INPUT_AMOUNT,
        9,
        [],
        TOKEN_PROGRAM_ID
      )
    );

  await provider
    .sendAndConfirm(
      fundInternalVaultTx
    );

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
   * 6. REAL Stocklana -> Jupiter CPI.
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
