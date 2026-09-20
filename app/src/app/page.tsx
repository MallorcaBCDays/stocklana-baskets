"use client";

import { useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { VerifiedLocalProof } from "@/components/VerifiedLocalProof";
import { RunJuryDemo } from "@/components/RunJuryDemo";
import {
  deriveBasketInfrastructure,
  STOCKLANA_PROGRAM_ID,
} from "@/lib/pdas";

type Constituent = {
  symbol: string;
  name: string;
  weightBps: number;
};

type Basket = {
  id: string;
  basketId: bigint;
  name: string;
  story: string;
  source: string;
  constituents: Constituent[];
};

const DEMO_CREATOR = new PublicKey(
  "3zSyiQDZxwia2n1TVGVJihEAgkpJAiSNvXFz1SUNYepp"
);

const BASKETS: Basket[] = [
  {
    id: "ai-markets",
    basketId: BigInt(101),
    name: "AI + Markets Index",
    story: "Pre-IPO exposure using the Stocklana PreStocks prototype.",
    source: "PreStocks prototype",
    constituents: [
      { symbol: "OPENAI", name: "OpenAI", weightBps: 3500 },
      { symbol: "ANTHROPIC", name: "Anthropic", weightBps: 3000 },
      { symbol: "FIGUREAI", name: "Figure AI", weightBps: 2000 },
      { symbol: "KALSHI", name: "Kalshi", weightBps: 1500 },
    ],
  },
  {
    id: "multi-asset",
    basketId: BigInt(102),
    name: "Multi-Asset Mix",
    story: "Equities, ETFs and gold using the Stocklana Pyth pricing prototype.",
    source: "Pyth pricing prototype",
    constituents: [
      { symbol: "TSLA", name: "Tesla", weightBps: 3500 },
      { symbol: "QQQ", name: "Nasdaq-100 ETF", weightBps: 3000 },
      { symbol: "VOO", name: "S&P 500 ETF", weightBps: 2500 },
      { symbol: "XAU", name: "Gold", weightBps: 1000 },
    ],
  },
  {
    id: "tech-leaders",
    basketId: BigInt(103),
    name: "Tech Leaders",
    story: "An xStocks-oriented example of a weighted tokenized-equity basket.",
    source: "xStocks-oriented demo",
    constituents: [
      { symbol: "NVDAx", name: "NVIDIA", weightBps: 3000 },
      { symbol: "MSFTx", name: "Microsoft", weightBps: 2500 },
      { symbol: "AAPLx", name: "Apple", weightBps: 2000 },
      { symbol: "AMZNx", name: "Amazon", weightBps: 1500 },
      { symbol: "GOOGLx", name: "Alphabet", weightBps: 1000 },
    ],
  },
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function shortAddress(value: PublicKey) {
  const address = value.toBase58();
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

function AddressRow({
  label,
  value,
}: {
  label: string;
  value: PublicKey;
}) {
  const address = value.toBase58();

  return (
    <div className="border-b border-white/[0.06] py-3 last:border-b-0">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/30">
        {label}
      </div>
      <button
        type="button"
        title={address}
        onClick={() => navigator.clipboard?.writeText(address)}
        className="mt-1 text-left font-mono text-xs text-cyan-100 transition hover:text-cyan-300"
      >
        {shortAddress(value)}
      </button>
    </div>
  );
}

export default function Home() {
  const [selectedId, setSelectedId] = useState(BASKETS[0].id);
  const [amountInput, setAmountInput] = useState("100");

  const basket =
    BASKETS.find((item) => item.id === selectedId) ?? BASKETS[0];

  const amount = useMemo(() => {
    const parsed = Number(amountInput);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [amountInput]);

  const infrastructure = useMemo(
    () =>
      deriveBasketInfrastructure(
        DEMO_CREATOR,
        basket.basketId,
        basket.constituents.length
      ),
    [basket]
  );

  return (
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8">
        <header className="mb-8 flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <div className="text-sm font-medium tracking-[0.2em] text-cyan-300">
              STOCKLANA BASKETS
            </div>
            <div className="mt-1 text-xs text-white/45">
              Interactive protocol demo
            </div>
          </div>

          <div className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-1.5 text-xs text-fuchsia-200">
            MVP · Demo mode
          </div>
        </header>

        <section className="mb-8 max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            One deposit.
            <br />
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
              One basket share.
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-white/55 md:text-lg">
            Preview how Stocklana converts a single deposit into a transparent
            weighted allocation across tokenized assets.
          </p>
        </section>

        <div className="mb-6">
          <RunJuryDemo />
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          <aside className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
              Basket presets
            </div>

            <div className="space-y-2">
              {BASKETS.map((item) => {
                const active = item.id === basket.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-cyan-300/40 bg-cyan-300/10"
                        : "border-white/8 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="mt-1 text-xs text-white/40">
                      {item.constituents.length} assets
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 md:p-6">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-2xl font-semibold">{basket.name}</div>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/45">
                  {basket.story}
                </p>
              </div>

              <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
                {basket.source}
              </span>
            </div>

            <div className="mt-6 space-y-5">
              {basket.constituents.map((asset) => {
                const percent = asset.weightBps / 100;

                return (
                  <div key={asset.symbol}>
                    <div className="mb-2 flex items-end justify-between gap-4">
                      <div>
                        <span className="font-mono font-semibold text-white">
                          {asset.symbol}
                        </span>
                        <span className="ml-2 text-sm text-white/35">
                          {asset.name}
                        </span>
                      </div>
                      <div className="font-mono text-sm text-white/70">
                        {percent.toFixed(0)}%
                      </div>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                Deposit amount
              </label>

              <div className="mt-3 flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-4">
                <span className="text-2xl text-white/35">$</span>
                <input
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  inputMode="decimal"
                  className="w-full bg-transparent px-3 py-4 text-3xl font-semibold outline-none"
                  aria-label="Deposit amount"
                />
                <span className="font-mono text-sm text-white/40">USDC</span>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <div className="grid grid-cols-[1fr_90px_120px] border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs uppercase tracking-[0.13em] text-white/35">
                <div>Asset</div>
                <div className="text-right">Weight</div>
                <div className="text-right">Target</div>
              </div>

              {basket.constituents.map((asset) => {
                const target = amount * (asset.weightBps / 10_000);

                return (
                  <div
                    key={asset.symbol}
                    className="grid grid-cols-[1fr_90px_120px] border-b border-white/[0.06] px-4 py-4 last:border-b-0"
                  >
                    <div className="font-mono">{asset.symbol}</div>
                    <div className="text-right font-mono text-white/55">
                      {(asset.weightBps / 100).toFixed(0)}%
                    </div>
                    <div className="text-right font-mono text-cyan-200">
                      {money(target)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-white/35">Total allocation</span>
              <span className="font-mono text-white">{money(amount)}</span>
            </div>

            <div className="mt-6 space-y-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4 text-xs leading-5 text-amber-100/60">
              <p>
                MVP accounting currently mints 1 basket share per 1 input unit.
                Production NAV-based share pricing is the next accounting layer.
              </p>
              <p>
                This screen demonstrates target allocation only. It does not
                claim live portfolio-backed settlement.
              </p>
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/60">
                    Deterministic PDA Preview
                  </div>
                  <div className="mt-1 text-[11px] text-white/30">
                    Basket ID {basket.basketId.toString()}
                  </div>
                </div>

                <span className="rounded-full border border-cyan-300/20 px-2 py-1 text-[10px] text-cyan-200/60">
                  derived locally
                </span>
              </div>

              <div className="mt-4 border-t border-white/[0.06]">
                <AddressRow label="Basket PDA" value={infrastructure.basket} />
                <AddressRow
                  label="Basket Share Mint"
                  value={infrastructure.basketMint}
                />
                <AddressRow
                  label="Stablecoin Vault"
                  value={infrastructure.stablecoinVault}
                />

                {infrastructure.constituentVaults.map((vault) => (
                  <AddressRow
                    key={vault.index}
                    label={`Constituent Vault ${vault.index}`}
                    value={vault.address}
                  />
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <div className="text-[10px] uppercase tracking-[0.15em] text-white/25">
                  Program
                </div>
                <div className="mt-1 break-all font-mono text-[11px] leading-5 text-white/50">
                  {STOCKLANA_PROGRAM_ID.toBase58()}
                </div>
              </div>

              <p className="mt-4 text-[11px] leading-5 text-white/30">
                These addresses are deterministically derived from the same PDA
                seeds used by the Stocklana Anchor program. They are a preview,
                not a claim that this preset is already deployed on Devnet.
              </p>
            </div>

            <VerifiedLocalProof />

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                Protocol flow
              </div>

              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <div className="text-white">1 · Deposit</div>
                  <div className="mt-1 text-white/40">
                    One input amount
                  </div>
                </div>
                <div>
                  <div className="text-white">2 · Allocate</div>
                  <div className="mt-1 text-white/40">
                    Deterministic basket weights
                  </div>
                </div>
                <div>
                  <div className="text-white">3 · Mint</div>
                  <div className="mt-1 text-white/40">
                    Fungible basket shares
                  </div>
                </div>
              </div>
            </div>

            <button
              disabled
              className="w-full cursor-not-allowed rounded-xl bg-gradient-to-r from-fuchsia-500/40 to-cyan-400/40 px-4 py-4 text-sm font-semibold text-white/50"
            >
              On-chain execution comes next
            </button>
          </aside>
        </div>

        <footer className="mt-8 border-t border-white/10 pt-5 text-xs text-white/30">
          Experimental software · Demo only · Not financial advice
        </footer>
      </div>
    </main>
  );
}
