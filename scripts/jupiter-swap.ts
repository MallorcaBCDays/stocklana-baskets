import * as anchor from "@coral-xyz/anchor";

type JupiterAccountMeta = {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
};

type JupiterInstruction = {
  programId: string;
  accounts: JupiterAccountMeta[];
  data: string;
};

type JupiterBuildResponse = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;

  swapInstruction?: JupiterInstruction;

  [key: string]: unknown;
};

const JUPITER_BUILD_URL =
  "https://api.jup.ag/swap/v2/build";

const JUPITER_SWAP_PROGRAM_ID =
  new anchor.web3.PublicKey(
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
  );

// Mainnet USDC
const USDC_MINT =
  new anchor.web3.PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );

// Wrapped SOL
const SOL_MINT =
  new anchor.web3.PublicKey(
    "So11111111111111111111111111111111111111112"
  );

const MAX_JUPITER_ACCOUNTS =
  50;

function deriveBasketAddresses(
  programId: anchor.web3.PublicKey,
  creator: anchor.web3.PublicKey,
  basketId: anchor.BN
) {
  const [basketPda] =
    anchor.web3.PublicKey
      .findProgramAddressSync(
        [
          Buffer.from("basket"),
          creator.toBuffer(),
          basketId.toArrayLike(
            Buffer,
            "le",
            8
          ),
        ],
        programId
      );

  const [basketMintPda] =
    anchor.web3.PublicKey
      .findProgramAddressSync(
        [
          Buffer.from(
            "basket_mint"
          ),
          basketPda.toBuffer(),
        ],
        programId
      );

  const [stablecoinVaultPda] =
    anchor.web3.PublicKey
      .findProgramAddressSync(
        [
          Buffer.from(
            "stablecoin_vault"
          ),
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
  programId: anchor.web3.PublicKey,
  basketPda: anchor.web3.PublicKey,
  index: number
) {
  const [constituentVaultPda] =
    anchor.web3.PublicKey
      .findProgramAddressSync(
        [
          Buffer.from(
            "constituent_vault"
          ),
          basketPda.toBuffer(),
          Buffer.from([index]),
        ],
        programId
      );

  return constituentVaultPda;
}

async function getJupiterBuild(
  inputMint: anchor.web3.PublicKey,
  outputMint: anchor.web3.PublicKey,
  amount: bigint,
  taker: anchor.web3.PublicKey
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

      slippageBps:
        "50",

      maxAccounts:
        MAX_JUPITER_ACCOUNTS
          .toString(),
    });

  const apiKey =
    process.env.JUPITER_API_KEY;

  const headers: Record<
    string,
    string
  > = {
    Accept:
      "application/json",
  };

  if (apiKey) {
    headers["x-api-key"] =
      apiKey;
  }

  const response =
    await fetch(
      `${JUPITER_BUILD_URL}?${params.toString()}`,
      {
        method: "GET",
        headers,
      }
    );

  const body =
    await response.text();

  if (!response.ok) {
    throw new Error(
      `Jupiter /build failed: ${response.status} ${body}`
    );
  }

  return JSON.parse(
    body
  ) as JupiterBuildResponse;
}

async function main() {
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

  /*
   * This basket does NOT need to exist yet.
   * We are only constructing an instruction
   * locally and will NOT submit it.
   */
  const basketId =
    new anchor.BN(
      1
    );

  const {
    basketPda,
    stablecoinVaultPda,
  } =
    deriveBasketAddresses(
      program.programId,
      creator,
      basketId
    );

  const constituentIndex =
    0;

  const constituentVaultPda =
    deriveConstituentVault(
      program.programId,
      basketPda,
      constituentIndex
    );

  console.log(
    "Stocklana Jupiter instruction builder"
  );

  console.log(
    "Basket PDA:",
    basketPda.toBase58()
  );

  console.log(
    "Stablecoin vault:",
    stablecoinVaultPda.toBase58()
  );

  console.log(
    "Constituent vault:",
    constituentVaultPda.toBase58()
  );

  /*
   * Jupiter must see the Basket PDA as the
   * taker because this PDA will sign the CPI
   * through invoke_signed().
   */
  const result =
    await getJupiterBuild(
      USDC_MINT,
      SOL_MINT,
      1_000_000n,
      basketPda
    );

  if (!result.swapInstruction) {
    throw new Error(
      "Jupiter did not return swapInstruction"
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

  const jupiterInstructionData =
    Buffer.from(
      swapInstruction.data,
      "base64"
    );

  const remainingAccounts =
    swapInstruction.accounts.map(
      (account) => ({
        pubkey:
          new anchor.web3.PublicKey(
            account.pubkey
          ),

        isWritable:
          account.isWritable,

        isSigner:
          account.isSigner,
      })
    );

  console.log(
    "\nJupiter instruction parsed."
  );

  console.log(
    "Remaining account count:",
    remainingAccounts.length
  );

  console.log(
    "Instruction data bytes:",
    jupiterInstructionData.length
  );

  console.log(
    "Minimum out:",
    result.otherAmountThreshold
  );

  console.log(
    "\nFirst 5 remaining accounts:"
  );

  for (
    const account of
    remainingAccounts.slice(
      0,
      5
    )
  ) {
    console.log({
      pubkey:
        account.pubkey.toBase58(),

      isWritable:
        account.isWritable,

      isSigner:
        account.isSigner,
    });
  }

  const outerInstruction =
    await program.methods
      .executeConstituentSwap(
        constituentIndex,

        new anchor.BN(
          1_000_000
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
          USDC_MINT,

        stablecoinVault:
          stablecoinVaultPda,

        constituentMint:
          SOL_MINT,

        constituentVault:
          constituentVaultPda,

        jupiterProgram:
          JUPITER_SWAP_PROGRAM_ID,

        tokenProgram:
          new anchor.web3.PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          ),
      })
      .remainingAccounts(
        remainingAccounts
      )
      .instruction();

  console.log(
    "\nStocklana outer instruction built."
  );

  console.log(
    "Outer program:",
    outerInstruction
      .programId
      .toBase58()
  );

  console.log(
    "Outer account count:",
    outerInstruction
      .keys
      .length
  );

  console.log(
    "Outer data length:",
    outerInstruction
      .data
      .length
  );

  console.log(
    "\nIMPORTANT: transaction was NOT sent."
  );
}

main()
  .then(() => {
    console.log(
      "\nDone"
    );
  })
  .catch((error) => {
    console.error(
      "\nERROR:"
    );

    console.error(
      error
    );

    process.exit(1);
  });