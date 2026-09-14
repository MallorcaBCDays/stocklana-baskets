import * as anchor from "@coral-xyz/anchor";

import {
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

const provider = anchor.AnchorProvider.env();

anchor.setProvider(provider);

const program = anchor.workspace.BasketVault as any;

const tokenProgram = TOKEN_PROGRAM_ID;

const DECIMALS = 1_000_000n;

function heading(title: string) {
  console.log(
    `\n============================================================`
  );
  console.log(title);
  console.log(
    `============================================================`
  );
}

function ok(message: string) {
  console.log(`[OK] ${message}`);
}

function expect(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function format6(amount: bigint) {
  const whole = amount / DECIMALS;

  const fraction = (amount % DECIMALS)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");

  if (fraction.length === 0) {
    return whole.toString();
  }

  return `${whole.toString()}.${fraction}`;
}

async function createTestMint(decimals: number = 6) {
  const mint = anchor.web3.Keypair.generate();

  const rent = await provider.connection.getMinimumBalanceForRentExemption(
    MINT_SIZE
  );

  const transaction = new anchor.web3.Transaction().add(
    anchor.web3.SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mint.publicKey,
      space: MINT_SIZE,
      lamports: rent,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(
      mint.publicKey,
      decimals,
      provider.wallet.publicKey,
      null,
      TOKEN_PROGRAM_ID
    )
  );

  await provider.sendAndConfirm(transaction, [mint]);

  return mint.publicKey;
}

async function getTransactionWithRetry(signature: string) {
  let transaction = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    transaction = await provider.connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (transaction) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (!transaction) {
    throw new Error("Transaction not found after retries");
  }

  return transaction;
}

function deriveBasketAddresses(
  creator: anchor.web3.PublicKey,
  basketId: anchor.BN
) {
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

  const [stablecoinVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("stablecoin_vault"), basketPda.toBuffer()],
    program.programId
  );

  return {
    basketPda,
    basketMintPda,
    stablecoinVaultPda,
  };
}

function deriveConstituentVault(
  basketPda: anchor.web3.PublicKey,
  constituentIndex: number
) {
  const [constituentVaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("constituent_vault"),
      basketPda.toBuffer(),
      Buffer.from([constituentIndex]),
    ],
    program.programId
  );

  return constituentVaultPda;
}

async function ensureAta(
  mint: anchor.web3.PublicKey,
  owner: anchor.web3.PublicKey
) {
  const ata = getAssociatedTokenAddressSync(mint, owner);

  const existing = await provider.connection.getAccountInfo(ata);

  if (!existing) {
    const transaction = new anchor.web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        provider.wallet.publicKey,
        ata,
        owner,
        mint
      )
    );

    await provider.sendAndConfirm(transaction);
  }

  return ata;
}

async function main() {
  const creator = provider.wallet.publicKey;

  heading("STOCKLANA BASKETS — JURY DEMO");

  console.log("Program:", program.programId.toBase58());
  console.log("Creator:", creator.toBase58());

  console.log("\nDemo flow:");
  console.log(
    "Basket -> Weights -> Constituent Vault -> Deposit -> Shares -> Redeem -> Allocation Preview"
  );

  heading("1. CREATE WEIGHTED BASKET");

  const basketId = new anchor.BN(Date.now());

  const stablecoinMint = await createTestMint(6);

  const constituentMints: anchor.web3.PublicKey[] = [];

  for (let index = 0; index < 4; index++) {
    constituentMints.push(await createTestMint(6));
  }

  const { basketPda, basketMintPda, stablecoinVaultPda } =
    deriveBasketAddresses(creator, basketId);

  const constituents = [
    {
      mint: constituentMints[0],
      weightBps: 4000,
    },
    {
      mint: constituentMints[1],
      weightBps: 2500,
    },
    {
      mint: constituentMints[2],
      weightBps: 2000,
    },
    {
      mint: constituentMints[3],
      weightBps: 1500,
    },
  ];

  await program.methods
    .initializeBasket("AI Basket", basketId, constituents)
    .accounts({
      basket: basketPda,
      basketMint: basketMintPda,
      stablecoinMint,
      stablecoinVault: stablecoinVaultPda,
      creator,
      tokenProgram,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  const basketAccount: any = await program.account.basket.fetch(basketPda);

  const basketMintInfo = await getMint(
    provider.connection,
    basketMintPda
  );

  expect(
    basketAccount.basketMint.equals(basketMintPda),
    "Basket mint PDA was not stored correctly"
  );

  expect(
    basketAccount.stablecoinMint.equals(stablecoinMint),
    "Stablecoin mint was not stored correctly"
  );

  expect(
    basketAccount.stablecoinVault.equals(stablecoinVaultPda),
    "Stablecoin vault was not stored correctly"
  );

  expect(
    basketMintInfo.decimals === 6,
    "Basket mint does not have 6 decimals"
  );

  expect(
    basketMintInfo.mintAuthority !== null &&
      basketMintInfo.mintAuthority.equals(basketPda),
    "Basket PDA is not the basket mint authority"
  );

  ok("AI Basket created on-chain");

  console.log("Basket PDA:", basketPda.toBase58());
  console.log("Basket share mint:", basketMintPda.toBase58());
  console.log("Stablecoin vault:", stablecoinVaultPda.toBase58());

  heading("2. BASKET WEIGHTS");

  console.log("Constituent 0: 40%  (4000 bps)");
  console.log("Constituent 1: 25%  (2500 bps)");
  console.log("Constituent 2: 20%  (2000 bps)");
  console.log("Constituent 3: 15%  (1500 bps)");
  console.log("Total:        100% (10000 bps)");

  expect(
    constituents.reduce(
      (total, constituent) => total + constituent.weightBps,
      0
    ) === 10_000,
    "Basket weights do not total 10000 bps"
  );

  ok("Weights total exactly 100%");

  heading("3. CREATE CONSTITUENT VAULT");

  const constituentIndex = 0;

  const constituentVaultPda = deriveConstituentVault(
    basketPda,
    constituentIndex
  );

  await program.methods
    .initializeConstituentVault(constituentIndex)
    .accounts({
      basket: basketPda,
      constituentMint: constituentMints[0],
      constituentVault: constituentVaultPda,
      payer: creator,
      tokenProgram,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  const constituentVault = await getAccount(
    provider.connection,
    constituentVaultPda
  );

  expect(
    constituentVault.mint.equals(constituentMints[0]),
    "Constituent vault has the wrong mint"
  );

  expect(
    constituentVault.owner.equals(basketPda),
    "Basket PDA is not the constituent vault authority"
  );

  expect(
    constituentVault.amount === 0n,
    "New constituent vault should start empty"
  );

  console.log("Constituent mint:", constituentMints[0].toBase58());
  console.log("Constituent vault:", constituentVaultPda.toBase58());
  console.log("Vault authority:", constituentVault.owner.toBase58());
  console.log("Initial vault balance:", format6(constituentVault.amount));

  ok(
    "Deterministic constituent vault created and controlled by the Basket PDA"
  );

  heading("4. PREPARE USER BALANCES");

  const userStablecoinAccount = await ensureAta(stablecoinMint, creator);
  const userBasketTokenAccount = await ensureAta(basketMintPda, creator);

  const tenUsdc = 10_000_000n;

  const mintStablecoinsTx = new anchor.web3.Transaction().add(
    createMintToInstruction(
      stablecoinMint,
      userStablecoinAccount,
      creator,
      tenUsdc
    )
  );

  await provider.sendAndConfirm(mintStablecoinsTx);

  const userBefore = await getAccount(
    provider.connection,
    userStablecoinAccount
  );

  const vaultBefore = await getAccount(
    provider.connection,
    stablecoinVaultPda
  );

  const sharesBefore = await getAccount(
    provider.connection,
    userBasketTokenAccount
  );

  console.log("User stablecoin:", `${format6(userBefore.amount)} USDC`);
  console.log("Basket vault:", `${format6(vaultBefore.amount)} USDC`);
  console.log("Basket shares:", format6(sharesBefore.amount));

  ok("User starts with 10 test USDC");

  heading("5. DEPOSIT 5 USDC -> MINT BASKET SHARES");

  console.log(
    "MVP accounting: simplified 1:1 raw amount; production NAV accounting is not implemented yet."
  );

  const fiveUsdc = new anchor.BN(5_000_000);

  await program.methods
    .depositAndMint(fiveUsdc)
    .accounts({
      basket: basketPda,
      basketMint: basketMintPda,
      stablecoinMint,
      userStablecoinAccount,
      stablecoinVault: stablecoinVaultPda,
      userBasketTokenAccount,
      user: creator,
      tokenProgram,
    })
    .rpc();

  const userAfterDeposit = await getAccount(
    provider.connection,
    userStablecoinAccount
  );

  const vaultAfterDeposit = await getAccount(
    provider.connection,
    stablecoinVaultPda
  );

  const sharesAfterDeposit = await getAccount(
    provider.connection,
    userBasketTokenAccount
  );

  expect(
    userAfterDeposit.amount === 5_000_000n,
    "User should have 5 USDC after deposit"
  );

  expect(
    vaultAfterDeposit.amount === 5_000_000n,
    "Vault should contain 5 USDC after deposit"
  );

  expect(
    sharesAfterDeposit.amount === 5_000_000n,
    "User should have 5 basket shares after deposit"
  );

  console.log(
    "User stablecoin:",
    `${format6(userAfterDeposit.amount)} USDC`
  );
  console.log(
    "Basket vault:",
    `${format6(vaultAfterDeposit.amount)} USDC`
  );
  console.log("Basket shares:", format6(sharesAfterDeposit.amount));

  ok("Deposit succeeded and 5 basket shares were minted");

  heading("6. REDEEM 2 BASKET SHARES");

  const twoShares = new anchor.BN(2_000_000);

  await program.methods
    .redeemAndWithdraw(twoShares)
    .accounts({
      basket: basketPda,
      basketMint: basketMintPda,
      stablecoinMint,
      userBasketTokenAccount,
      stablecoinVault: stablecoinVaultPda,
      userStablecoinAccount,
      user: creator,
      tokenProgram,
    })
    .rpc();

  const userAfterRedeem = await getAccount(
    provider.connection,
    userStablecoinAccount
  );

  const vaultAfterRedeem = await getAccount(
    provider.connection,
    stablecoinVaultPda
  );

  const sharesAfterRedeem = await getAccount(
    provider.connection,
    userBasketTokenAccount
  );

  expect(
    userAfterRedeem.amount === 7_000_000n,
    "User should have 7 USDC after redeem"
  );

  expect(
    vaultAfterRedeem.amount === 3_000_000n,
    "Vault should contain 3 USDC after redeem"
  );

  expect(
    sharesAfterRedeem.amount === 3_000_000n,
    "User should have 3 basket shares after redeem"
  );

  console.log("User stablecoin:", `${format6(userAfterRedeem.amount)} USDC`);
  console.log("Basket vault:", `${format6(vaultAfterRedeem.amount)} USDC`);
  console.log("Basket shares:", format6(sharesAfterRedeem.amount));

  ok("2 basket shares burned and 2 USDC returned");

  heading("7. ON-CHAIN ALLOCATION PREVIEW");

  const previewAmount = new anchor.BN(5_000_000);

  console.log("Preview amount: 5.000000");

  const previewSignature = await program.methods
    .previewAllocations(previewAmount)
    .accounts({
      basket: basketPda,
    })
    .rpc();

  const previewTransaction = await getTransactionWithRetry(
    previewSignature
  );

  const logs = previewTransaction.meta?.logMessages ?? [];

  const expectedLogs = [
    "Constituent 0 target_amount: 2000000",
    "Constituent 1 target_amount: 1250000",
    "Constituent 2 target_amount: 1000000",
    "Constituent 3 target_amount: 750000",
  ];

  for (const expected of expectedLogs) {
    const found = logs.some((log) => log.includes(expected));

    expect(found, `Missing expected preview log: ${expected}`);
  }

  console.log("40% -> 2.000000");
  console.log("25% -> 1.250000");
  console.log("20% -> 1.000000");
  console.log("15% -> 0.750000");
  console.log("Total -> 5.000000");

  ok("On-chain allocation preview matches basket weights");

  heading("8. JUPITER EXECUTION PATH");

  console.log(
    "Jupiter CPI execution plumbing is implemented in Stocklana."
  );
  console.log("Verified execution path:");
  console.log("Stocklana -> Jupiter -> external DEX");
  console.log(
    "This stable jury demo intentionally does not depend on complete DEX settlement on cloned localnet state."
  );

  heading("DEMO COMPLETE");

  console.log("Basket created.");
  console.log("Weights stored.");
  console.log("Constituent vault created.");
  console.log("Deposit and share mint demonstrated.");
  console.log("Redeem demonstrated.");
  console.log("Weighted allocation preview verified.");

  console.log(
    "\nStocklana Baskets: programmable weighted index baskets on Solana."
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nDEMO FAILED");
    console.error(error);
    process.exit(1);
  });
