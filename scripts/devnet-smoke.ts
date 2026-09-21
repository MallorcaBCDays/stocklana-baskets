import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const baseProvider = anchor.AnchorProvider.env();

const provider = new anchor.AnchorProvider(
  baseProvider.connection,
  baseProvider.wallet,
  {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  }
);

anchor.setProvider(provider);

const program = anchor.workspace.BasketVault as any;
const creator = provider.wallet.publicKey;

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function finalize(signature: string) {
  console.log("Waiting for finalization:", signature);
  await provider.connection.confirmTransaction(signature, "finalized");
  await sleep(1500);
}

function deriveBasketAddresses(basketId: anchor.BN) {
  const [basketPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("basket"),
      creator.toBuffer(),
      basketId.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );

  const [basketMintPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("basket_mint"), basketPda.toBuffer()],
    program.programId
  );

  const [stablecoinVaultPda] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("stablecoin_vault"), basketPda.toBuffer()],
      program.programId
    );

  return {
    basketPda,
    basketMintPda,
    stablecoinVaultPda,
  };
}

async function main() {
  console.log("STOCKLANA DEVNET SMOKE TEST");
  console.log("Program:", program.programId.toBase58());
  console.log("Creator:", creator.toBase58());

  const rent =
    await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const stablecoinMint = anchor.web3.Keypair.generate();
  const constituentMint = anchor.web3.Keypair.generate();

  const mintTx = new anchor.web3.Transaction();

  for (const mint of [stablecoinMint, constituentMint]) {
    mintTx.add(
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: creator,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports: rent,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMint2Instruction(
        mint.publicKey,
        6,
        creator,
        null,
        TOKEN_PROGRAM_ID
      )
    );
  }

  const mintSig = await provider.sendAndConfirm(
    mintTx,
    [stablecoinMint, constituentMint]
  );

  console.log("Mint setup tx:", mintSig);
  await finalize(mintSig);

  const basketId = new anchor.BN(Date.now());

  const {
    basketPda,
    basketMintPda,
    stablecoinVaultPda,
  } = deriveBasketAddresses(basketId);

  const constituents = [
    {
      mint: constituentMint.publicKey,
      weightBps: 10_000,
    },
  ];

  const initSig = await program.methods
    .initializeBasket("Devnet Basket", basketId, constituents)
    .accounts({
      basket: basketPda,
      basketMint: basketMintPda,
      stablecoinMint: stablecoinMint.publicKey,
      stablecoinVault: stablecoinVaultPda,
      creator,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("Initialize tx:", initSig);
  await finalize(initSig);

  console.log("Basket PDA:", basketPda.toBase58());
  console.log("Basket share mint:", basketMintPda.toBase58());
  console.log("Stablecoin mint:", stablecoinMint.publicKey.toBase58());
  console.log("Stablecoin vault:", stablecoinVaultPda.toBase58());

  const userStablecoinAccount = getAssociatedTokenAddressSync(
    stablecoinMint.publicKey,
    creator
  );

  const userBasketTokenAccount = getAssociatedTokenAddressSync(
    basketMintPda,
    creator
  );

  const prepareTx = new anchor.web3.Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      creator,
      userStablecoinAccount,
      creator,
      stablecoinMint.publicKey
    ),
    createAssociatedTokenAccountIdempotentInstruction(
      creator,
      userBasketTokenAccount,
      creator,
      basketMintPda
    ),
    createMintToInstruction(
      stablecoinMint.publicKey,
      userStablecoinAccount,
      creator,
      10_000_000n
    )
  );

  const prepareSig = await provider.sendAndConfirm(prepareTx);

  console.log("Prepare user tx:", prepareSig);
  await finalize(prepareSig);

  const depositSig = await program.methods
    .depositAndMint(new anchor.BN(5_000_000))
    .accounts({
      basket: basketPda,
      basketMint: basketMintPda,
      stablecoinMint: stablecoinMint.publicKey,
      userStablecoinAccount,
      stablecoinVault: stablecoinVaultPda,
      userBasketTokenAccount,
      user: creator,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("Deposit tx:", depositSig);
  await finalize(depositSig);

  const userStable = await getAccount(
    provider.connection,
    userStablecoinAccount
  );

  await sleep(1000);

  const vault = await getAccount(
    provider.connection,
    stablecoinVaultPda
  );

  await sleep(1000);

  const shares = await getAccount(
    provider.connection,
    userBasketTokenAccount
  );

  console.log("");
  console.log("POST-DEPOSIT");
  console.log(
    "User stablecoin:",
    Number(userStable.amount) / 1_000_000
  );
  console.log(
    "Basket vault:",
    Number(vault.amount) / 1_000_000
  );
  console.log(
    "Basket shares:",
    Number(shares.amount) / 1_000_000
  );

  if (
    userStable.amount !== 5_000_000n ||
    vault.amount !== 5_000_000n ||
    shares.amount !== 5_000_000n
  ) {
    throw new Error("Unexpected post-deposit balances");
  }

  console.log("");
  console.log("✅ DEVNET DEPOSIT VERIFIED");
  console.log("Deposit signature:", depositSig);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
