"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function DevnetWalletButton() {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-cyan-200/70">
        Devnet
      </span>

      <WalletMultiButton
        style={{
          background: "linear-gradient(90deg, #d946ef, #22d3ee)",
          borderRadius: "9999px",
          color: "#05070b",
          fontWeight: 700,
          height: "44px",
          padding: "0 20px",
        }}
      />
    </div>
  );
}
