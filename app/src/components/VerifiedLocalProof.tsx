"use client";

import { useState } from "react";
import { VERIFIED_LOCAL_PROOF } from "@/data/local-proof";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

function ProofAddress({
  label,
  address,
}: {
  label: string;
  address: string;
}) {
  return (
    <div className="border-b border-white/[0.06] py-3 last:border-b-0">
      <div className="text-[10px] uppercase tracking-[0.14em] text-white/30">
        {label}
      </div>

      <button
        type="button"
        title={address}
        onClick={() => navigator.clipboard?.writeText(address)}
        className="mt-1 font-mono text-xs text-emerald-200 transition hover:text-emerald-100"
      >
        {shortAddress(address)}
      </button>
    </div>
  );
}

export function VerifiedLocalProof() {
  const [expanded, setExpanded] = useState(false);
  const { flow } = VERIFIED_LOCAL_PROOF;

  return (
    <section className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.04] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
            Verified Local Program Run
          </div>

          <div className="mt-1 text-[11px] text-white/35">
            Real Anchor instructions · local Solana validator
          </div>
        </div>

        <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[10px] font-medium text-emerald-200">
          ✓ DEMO COMPLETE
        </span>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-cyan-300/10 bg-cyan-300/[0.03] px-4 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-cyan-200/40">
              Deposit
            </div>
            <div className="mt-1 text-xs text-white/40">
              {flow.depositUsdc} USDC deposited
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono text-lg text-cyan-100">
              {flow.sharesAfterDeposit} shares
            </div>
            <div className="text-[10px] text-white/30">minted</div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-fuchsia-300/10 bg-fuchsia-300/[0.03] px-4 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.12em] text-fuchsia-200/40">
              Redeem
            </div>
            <div className="mt-1 text-xs text-white/40">
              {flow.redeemedShares} shares burned
            </div>
          </div>

          <div className="text-right">
            <div className="font-mono text-lg text-fuchsia-100">
              {flow.sharesAfterRedeem} shares
            </div>
            <div className="text-[10px] text-white/30">
              {flow.returnedUsdc} USDC returned
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-white/[0.06]">
        <ProofAddress
          label="Basket PDA"
          address={VERIFIED_LOCAL_PROOF.basketPda}
        />
        <ProofAddress
          label="Basket Share Mint"
          address={VERIFIED_LOCAL_PROOF.basketShareMint}
        />
      </div>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3 text-xs font-medium text-white/55 transition hover:border-white/20 hover:text-white/80"
      >
        {expanded ? "Hide full proof" : "View full proof"}
      </button>

      {expanded && (
        <div className="mt-4">
          <div className="border-t border-white/[0.06]">
            <ProofAddress
              label="Stablecoin Vault"
              address={VERIFIED_LOCAL_PROOF.stablecoinVault}
            />
            <ProofAddress
              label="Constituent Vault"
              address={VERIFIED_LOCAL_PROOF.constituentVault}
            />
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="grid grid-cols-2 gap-y-3 text-xs">
              <span className="text-white/35">Initial vault</span>
              <span className="text-right font-mono text-white/60">
                {flow.initialVaultUsdc} USDC
              </span>

              <span className="text-white/35">Initial shares</span>
              <span className="text-right font-mono text-white/60">
                {flow.initialShares}
              </span>

              <span className="text-white/35">Vault after deposit</span>
              <span className="text-right font-mono text-cyan-100">
                {flow.vaultAfterDepositUsdc} USDC
              </span>

              <span className="text-white/35">Vault after redeem</span>
              <span className="text-right font-mono text-fuchsia-100">
                {flow.vaultAfterRedeemUsdc} USDC
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {VERIFIED_LOCAL_PROOF.notes.map((note) => (
              <div
                key={note}
                className="flex gap-2 text-[11px] leading-5 text-white/40"
              >
                <span className="text-emerald-300">✓</span>
                <span>{note}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[10px] leading-4 text-white/25">
            This proof comes from a successful run against the deployed
            Stocklana program on a local Solana validator. It is not presented
            as Devnet or Mainnet activity.
          </p>
        </div>
      )}
    </section>
  );
}
