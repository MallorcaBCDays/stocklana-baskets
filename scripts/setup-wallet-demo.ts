import * as anchor from "@coral-xyz/anchor";
import {
  createInitializeMint2Instruction,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.BasketVault as any;
const creator = provider.wallet.publicKey;

const CIRCLE_DEVNET_USDC = new anchor.web3.PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

// Fixed ID so the wallet demo basket is deterministic and easy to recover.
const BASKET_ID = new anchor.BN(20260922);

function deriveBasketAddresses() {
  const [basketPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("basket"),
      creator.toBuffer(),
      BASKET_ID.toArrayLike(Buffer, "le", 8),
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

  return { basketPda, basketMintPda, stablecoinVaultPda };
}

async function main() {
  console.log("STOCKLANA WALLET DEMO SETUP");
  console.log("Program:", program.programId.toBase58());
  console.log("Creator:", creator.toBase58());
  console.log("Stablecoin:", CIRCLE_DEVNET_USDC.toBase58());
  console.log("Basket ID:", BASKET_ID.toString());

  const rent =
    await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const constituentMints = Array.from(
    { length: 4 },
    () => anchor.web3.Keypair.generate()
  );

  const mintTx = new anchor.web3.Transaction();

  for (const mint of constituentMints) {
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
    constituentMints
  );

  console.log("Constituent mint tx:", mintSig);

  const { basketPda, basketMintPda, stablecoinVaultPda } =
    deriveBasketAddresses();

  const constituents = [
    { mint: constituentMints[0].publicKey, weightBps: 4000 },
    { mint: constituentMints[1].publicKey, weightBps: 2500 },
    { mint: constituentMints[2].publicKey, weightBps: 2000 },
    { mint: constituentMints[3].publicKey, weightBps: 1500 },
  ];

  const initSig = await program.methods
    .initializeBasket(
      "Stocklana Devnet Demo",
      BASKET_ID,
      constituents
    )
    .accounts({
      basket: basketPda,
      basketMint: basketMintPda,
      stablecoinMint: CIRCLE_DEVNET_USDC,
      stablecoinVault: stablecoinVaultPda,
      creator,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("");
  console.log("✅ WALLET DEMO BASKET READY");
  console.log("Initialize tx:", initSig);
  console.log("Basket PDA:", basketPda.toBase58());
  console.log("Basket share mint:", basketMintPda.toBase58());
  console.log("Stablecoin vault:", stablecoinVaultPda.toBase58());
  console.log("Circle Devnet USDC:", CIRCLE_DEVNET_USDC.toBase58());

  console.log("");
  console.log("Constituents:");
  constituents.forEach((item, index) => {
    console.log(
      `${index}: ${item.mint.toBase58()} (${item.weightBps} bps)`
    );
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
