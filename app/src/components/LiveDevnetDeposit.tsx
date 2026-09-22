"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Transaction, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { DEVNET_WALLET_DEMO } from "@/data/devnet-wallet-demo";

type Balances = {
  usdc: number;
  shares: number;
};

const DEPOSIT_AND_MINT_DISCRIMINATOR = [
  97, 126, 119, 210, 67, 186, 64, 23,
];

const ONE_USDC = 1_000_000;

export default function LiveDevnetDeposit() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();

  const [balances, setBalances] = useState<Balances | null>(null);
  const [loading, setLoading] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [lastSignature, setLastSignature] = useState<string | null>(null);

  const [status, setStatus] = useState(
    "Connect a wallet to inspect Devnet balances."
  );

  const refreshBalances = useCallback(async () => {
    if (!publicKey) {
      setBalances(null);
      setStatus("Connect a wallet to inspect Devnet balances.");
      return;
    }

    setLoading(true);
    setStatus("Reading Solana Devnet...");

    try {
      const usdcAta = getAssociatedTokenAddressSync(
        DEVNET_WALLET_DEMO.stablecoinMint,
        publicKey
      );

      const basketAta = getAssociatedTokenAddressSync(
        DEVNET_WALLET_DEMO.basketMint,
        publicKey
      );

      let usdc = 0;
      let shares = 0;

      try {
        const balance = await connection.getTokenAccountBalance(usdcAta);
        usdc = Number(balance.value.uiAmountString ?? "0");
      } catch {
        usdc = 0;
      }

      try {
        const balance = await connection.getTokenAccountBalance(basketAta);
        shares = Number(balance.value.uiAmountString ?? "0");
      } catch {
        shares = 0;
      }

      setBalances({ usdc, shares });
      setStatus("Connected to Solana Devnet.");
    } catch (error) {
      console.error(error);
      setStatus("Could not read Devnet balances.");
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  const depositOneUsdc = useCallback(async () => {
    if (!publicKey) {
      setStatus("Connect a wallet first.");
      return;
    }

    if (!balances || balances.usdc < 1) {
      setStatus("At least 1 Circle Devnet USDC is required.");
      return;
    }

    setDepositing(true);
    setLastSignature(null);
    setStatus("Preparing 1 USDC deposit...");

    try {
      const usdcAta = getAssociatedTokenAddressSync(
        DEVNET_WALLET_DEMO.stablecoinMint,
        publicKey
      );

      const basketAta = getAssociatedTokenAddressSync(
        DEVNET_WALLET_DEMO.basketMint,
        publicKey
      );

      const usdcAccount = await connection.getAccountInfo(usdcAta);

      if (!usdcAccount) {
        setStatus(
          "No Circle Devnet USDC token account found for this wallet."
        );
        return;
      }

      const transaction = new Transaction();

      const basketAccount = await connection.getAccountInfo(basketAta);

      if (!basketAccount) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            basketAta,
            publicKey,
            DEVNET_WALLET_DEMO.basketMint,
            TOKEN_PROGRAM_ID
          )
        );
      }

      const instructionData = Buffer.alloc(16);

      Buffer.from(DEPOSIT_AND_MINT_DISCRIMINATOR).copy(
        instructionData,
        0
      );

      instructionData.writeUInt32LE(ONE_USDC, 8);
      instructionData.writeUInt32LE(0, 12);

      transaction.add(
        new TransactionInstruction({
          programId: DEVNET_WALLET_DEMO.programId,
          keys: [
            {
              pubkey: DEVNET_WALLET_DEMO.basket,
              isSigner: false,
              isWritable: false,
            },
            {
              pubkey: DEVNET_WALLET_DEMO.basketMint,
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: DEVNET_WALLET_DEMO.stablecoinMint,
              isSigner: false,
              isWritable: false,
            },
            {
              pubkey: usdcAta,
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: DEVNET_WALLET_DEMO.stablecoinVault,
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: basketAta,
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: publicKey,
              isSigner: true,
              isWritable: false,
            },
            {
              pubkey: TOKEN_PROGRAM_ID,
              isSigner: false,
              isWritable: false,
            },
          ],
          data: instructionData,
        })
      );

      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");

      transaction.feePayer = publicKey;
      transaction.recentBlockhash = blockhash;

      setStatus("Approve the 1 USDC deposit in your wallet...");

      const signature = await sendTransaction(
        transaction,
        connection,
        {
          skipPreflight: false,
        }
      );

      setStatus("Waiting for Devnet confirmation...");

      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(
            confirmation.value.err
          )}`
        );
      }

      setLastSignature(signature);

      await refreshBalances();

      setStatus("✓ Live Devnet deposit confirmed.");
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error ? error.message : "Unknown wallet error";

      setStatus(`Deposit failed: ${message}`);
    } finally {
      setDepositing(false);
    }
  }, [
    balances,
    connection,
    publicKey,
    refreshBalances,
    sendTransaction,
  ]);

  useEffect(() => {
    void refreshBalances();
  }, [refreshBalances]);

  const canDeposit =
    connected &&
    !!balances &&
    balances.usdc >= 1 &&
    !depositing &&
    !loading;

  return (
    <section className="rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.025] p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
            Live Devnet proof
          </div>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Deposit into the deployed Stocklana basket
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
            Uses the public Stocklana program on Solana Devnet and
            Circle Devnet USDC. No mainnet assets are involved.
          </p>
        </div>

        <div className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-cyan-200/70">
          Devnet
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-black/20 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200/70">
          Fresh-wallet setup
        </div>

        <ol className="mt-3 space-y-2 text-sm leading-6 text-white/55">
          <li>
            1. Switch Phantom to <strong className="text-white/75">Solana Devnet</strong>.
          </li>
          <li>
            2. Get Devnet SOL for fees:{" "}
            <a
              href="https://faucet.solana.com/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-cyan-300/80 transition hover:text-cyan-200"
            >
              Solana faucet ↗
            </a>
          </li>
          <li>
            3. Get at least 1 Circle Devnet USDC:{" "}
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-cyan-300/80 transition hover:text-cyan-200"
            >
              Circle faucet ↗
            </a>
          </li>
        </ol>

        <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2 text-xs">
          <span className="text-white/35">Circle Devnet USDC mint</span>
          <code className="mt-1 block break-all text-white/55">
            4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
          </code>
        </div>

        <p className="mt-3 text-xs leading-5 text-amber-100/55">
          Test assets only. Never send mainnet SOL or mainnet USDC to this demo.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-white/30">
            Circle Devnet USDC
          </div>

          <div className="mt-2 text-2xl font-semibold text-white">
            {connected && balances
              ? balances.usdc.toFixed(2)
              : "—"}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-white/30">
            Stocklana basket shares
          </div>

          <div className="mt-2 text-2xl font-semibold text-white">
            {connected && balances
              ? balances.shares.toFixed(2)
              : "—"}
          </div>
        </div>
      </div>

      <section
        aria-labelledby="live-allocation-preview"
        className="mt-5 rounded-2xl border border-fuchsia-300/10 bg-fuchsia-300/[0.025] p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fuchsia-200/70">
              Target allocation
            </div>
            <h3
              id="live-allocation-preview"
              className="mt-1 text-sm font-semibold text-white/85"
            >
              1 USDC deposit preview
            </h3>
          </div>

          <div className="rounded-full border border-fuchsia-300/15 bg-fuchsia-300/5 px-3 py-1 text-[11px] font-medium text-fuchsia-200/65">
            40 / 25 / 20 / 15
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {DEVNET_WALLET_DEMO.weightsBps.map((weightBps, index) => {
            const mint =
              DEVNET_WALLET_DEMO.constituents[index]?.toBase58() ??
              "Unavailable";
            const weightPercent = weightBps / 100;
            const targetUsdc = (weightBps / 10_000).toFixed(2);

            return (
              <div
                key={mint}
                className="rounded-xl border border-white/5 bg-black/20 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-medium text-white/70">
                    Constituent {index + 1}
                  </div>
                  <div className="text-xs font-semibold text-fuchsia-200/75">
                    {weightPercent}%
                  </div>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-fuchsia-400/70 to-cyan-300/70"
                    style={{ width: `${weightPercent}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                  <code className="text-white/30" title={mint}>
                    {mint.slice(0, 4)}...{mint.slice(-4)}
                  </code>
                  <span className="text-white/50">{targetUsdc} USDC target</span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs leading-5 text-white/40">
          Preview only. The current deposit mints one basket share 1:1; it
          does not yet execute constituent swaps or portfolio-backed
          settlement.
        </p>
      </section>

      <div className="mt-5 rounded-2xl border border-amber-300/10 bg-amber-300/[0.025] px-4 py-3 text-xs leading-5 text-amber-100/55">
        MVP accounting is currently 1:1: depositing 1 USDC mints
        1 basket share. Production NAV-based pricing and
        portfolio-backed settlement are not implemented yet.
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-white/40">{status}</p>

          {connected && balances && balances.usdc < 1 && (
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-medium text-cyan-300/80 transition hover:text-cyan-200"
            >
              Get Circle Devnet USDC ↗
            </a>
          )}

          {lastSignature && (
            <a
              href={`https://explorer.solana.com/tx/${lastSignature}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-xs font-medium text-emerald-300/80 transition hover:text-emerald-200"
            >
              View confirmed transaction ↗
            </a>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void depositOneUsdc()}
            disabled={!canDeposit}
            className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {depositing ? "Depositing..." : "Deposit 1 USDC"}
          </button>

          <button
            type="button"
            onClick={() => void refreshBalances()}
            disabled={!connected || loading || depositing}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Refreshing..." : "Refresh balances"}
          </button>
        </div>
      </div>
    </section>
  );
}
