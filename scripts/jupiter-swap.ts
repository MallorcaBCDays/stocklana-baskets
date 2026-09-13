import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const JUPITER_BUILD_URL =
  "https://api.jup.ag/swap/v2/build";

const JUPITER_SWAP_PROGRAM_ID =
  new PublicKey(
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
  );

const USDC_MINT =
  new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );

const SOL_MINT =
  new PublicKey(
    "So11111111111111111111111111111111111111112"
  );

const TOKEN_PROGRAM_ID =
  new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
  );

const MAX_JUPITER_ACCOUNTS = 50;

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
  inputMint: PublicKey,
  outputMint: PublicKey,
  amount: bigint,
  taker: PublicKey,
  destinationTokenAccount: PublicKey
): Promise<JupiterBuildResponse> {
  const params =
    new URLSearchParams({
      inputMint:
        inputMint.toBase58(),

      outputMint:
        outputMint.toBase58(),

      amount:
        amount.toString(),

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

  let result:
    JupiterBuildResponse;

  try {
    result =
      JSON.parse(text);
  } catch {
    throw new Error(
      `Could not parse Jupiter response: ${text}`
    );
  }

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

  return result;
}

async function main() {
  console.log(
    "Stocklana Jupiter instruction builder"
  );

  const provider =
    anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const program =
    anchor.workspace
      .BasketVault as anchor.Program;

  const creator =
    provider.wallet.publicKey;

  console.log(
    "RPC:",
    provider.connection.rpcEndpoint
  );

  console.log(
    "Wallet:",
    creator.toBase58()
  );

  console.log(
    "Stocklana program:",
    program.programId.toBase58()
  );

  /*
   * Read/build-only test.
   * No transaction will be sent.
   */
  const basketId =
    new anchor.BN(1);

  const constituentIndex = 0;

  const {
    basketPda,
    basketMintPda,
    stablecoinVaultPda,
  } =
    deriveBasketAddresses(
      program.programId,
      creator,
      basketId
    );

  const constituentVaultPda =
    deriveConstituentVault(
      program.programId,
      basketPda,
      constituentIndex
    );

  /*
   * Jupiter uses the taker's normal USDC
   * token account as the source.
   *
   * basketPda is off-curve, hence true.
   */
  const basketUsdcAta =
    getAssociatedTokenAddressSync(
      USDC_MINT,
      basketPda,
      true
    );

  console.log("");
  console.log("Derived addresses:");

  console.log(
    "Basket PDA:",
    basketPda.toBase58()
  );

  console.log(
    "Basket mint:",
    basketMintPda.toBase58()
  );

  console.log(
    "Internal stablecoin vault:",
    stablecoinVaultPda.toBase58()
  );

  console.log(
    "Basket USDC ATA:",
    basketUsdcAta.toBase58()
  );

  console.log(
    "Constituent vault:",
    constituentVaultPda.toBase58()
  );

  const inputAmount =
    1_000_000n;

  console.log("");
  console.log(
    "Requesting Jupiter USDC -> SOL route..."
  );

  console.log(
    "Input amount:",
    inputAmount.toString()
  );

  console.log(
    "Destination token account:",
    constituentVaultPda.toBase58()
  );

  console.log(
    "Configured maxAccounts:",
    MAX_JUPITER_ACCOUNTS
  );

  const result =
    await getJupiterBuild(
      USDC_MINT,
      SOL_MINT,
      inputAmount,
      basketPda,
      constituentVaultPda
    );

  if (!result.swapInstruction) {
    throw new Error(
      "Jupiter response has no swapInstruction"
    );
  }

  const swapInstruction =
    result.swapInstruction;

  if (
    swapInstruction.programId !==
    JUPITER_SWAP_PROGRAM_ID.toBase58()
  ) {
    throw new Error(
      `Unexpected Jupiter program: ${swapInstruction.programId}`
    );
  }

  console.log("");
  console.log(
    "Jupiter instruction parsed."
  );

  console.log(
    "Jupiter program:",
    swapInstruction.programId
  );

  if (result.inAmount) {
    console.log(
      "Input amount:",
      result.inAmount
    );
  }

  if (result.outAmount) {
    console.log(
      "Expected output:",
      result.outAmount
    );
  }

  if (
    result.otherAmountThreshold
  ) {
    console.log(
      "Minimum output:",
      result.otherAmountThreshold
    );
  }

  if (result.swapMode) {
    console.log(
      "Swap mode:",
      result.swapMode
    );
  }

  if (
    result.routePlan &&
    result.routePlan.length > 0
  ) {
    console.log("");
    console.log(
      "Route steps:",
      result.routePlan.length
    );

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

  console.log("");
  console.log(
    "Remaining account count:",
    remainingAccounts.length
  );

  console.log(
    "Jupiter instruction data bytes:",
    jupiterInstructionData.length
  );

  /*
   * Important diagnostic:
   * prove which source/destination Jupiter
   * really put into its instruction.
   */
  const sourceAccountFound =
    remainingAccounts.some(
      (account) =>
        account.pubkey.equals(
          basketUsdcAta
        )
    );

  const destinationAccountFound =
    remainingAccounts.some(
      (account) =>
        account.pubkey.equals(
          constituentVaultPda
        )
    );

  console.log("");
  console.log(
    "Basket USDC source ATA present:",
    sourceAccountFound
  );

  console.log(
    "Stocklana constituent destination present:",
    destinationAccountFound
  );

  if (!sourceAccountFound) {
    throw new Error(
      "SOURCE CHECK failed: Basket USDC ATA missing from Jupiter instruction"
    );
  }

  if (!destinationAccountFound) {
    throw new Error(
      "DESTINATION CHECK failed: constituent vault missing from Jupiter instruction"
    );
  }

  console.log("");
  console.log(
    "SOURCE CHECK: PASS"
  );

  console.log(
    "DESTINATION CHECK: PASS"
  );

  if (
    !result.otherAmountThreshold
  ) {
    throw new Error(
      "Jupiter response has no otherAmountThreshold"
    );
  }

  const minimumOut =
    new anchor.BN(
      result.otherAmountThreshold
    );

  /*
   * Build the existing Stocklana outer
   * instruction exactly as before.
   *
   * Rust is NOT changed yet.
   */
  const outerInstruction =
    await program.methods
      .executeConstituentSwap(
        constituentIndex,

        new anchor.BN(
          inputAmount.toString()
        ),

        minimumOut,

        jupiterInstructionData
      )
      .accounts({
        basket:
          basketPda,

        stablecoinMint:
          USDC_MINT,

        stablecoinVault:
          stablecoinVaultPda,

        basketStablecoinAta:
          basketUsdcAta,

        constituentMint:
          SOL_MINT,

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
      .instruction();

  console.log("");
  console.log(
    "Stocklana outer instruction built."
  );

  console.log(
    "Outer program:",
    outerInstruction.programId.toBase58()
  );

  console.log(
    "Outer account count:",
    outerInstruction.keys.length
  );

  console.log(
    "Outer data length:",
    outerInstruction.data.length
  );

  console.log("");
  console.log(
    "IMPORTANT: transaction was NOT sent."
  );

  console.log("");
  console.log("Done");
}

main().catch(
  (error) => {
    console.error("");
    console.error(
      "Stocklana Jupiter script failed:"
    );
    console.error(error);
    process.exit(1);
  }
);