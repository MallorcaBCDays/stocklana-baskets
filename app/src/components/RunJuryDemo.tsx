"use client";

import { useState } from "react";
import { VERIFIED_LOCAL_PROOF } from "@/data/local-proof";

type DemoStep = {
  title: string;
  detail: string;
};

const STEPS: DemoStep[] = [
  {
    title: "Basket initialized",
    detail: "AI Basket created through the Stocklana Anchor program.",
  },
  {
    title: "Weights stored",
    detail: "40% / 25% / 20% / 15% · total 10,000 bps.",
  },
  {
    title: "Constituent vault created",
    detail: "Deterministic token vault controlled by the Basket PDA.",
  },
  {
    title: "Allocation preview verified",
    detail: "5 USDC → 2.00 / 1.25 / 1.00 / 0.75 target allocation.",
  },
  {
    title: "Deposit executed",
    detail: "5 USDC deposited → 5 basket shares minted.",
  },
  {
    title: "Redeem executed",
    detail: "2 shares burned → 2 USDC returned → 3 shares remain.",
  },
  {
    title: "Execution path verified",
    detail: "Stocklana → Jupiter → external DEX program path reached.",
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function RunJuryDemo() {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  async function runDemo() {
    if (running) return;

    setRunning(true);
    setCompleted(0);
    setSelectedStep(null);

    for (let index = 0; index < STEPS.length; index += 1) {
      await sleep(index === 0 ? 300 : 500);
      setCompleted(index + 1);
    }

    setRunning(false);
  }

  const finished = completed === STEPS.length;

  return (
    <section className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/[0.03] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-200/70">
            Jury Demo
          </div>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Run the verified Stocklana flow
          </h2>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-white/40">
            Replays the steps from a successful local Anchor program run.
            No new transaction is submitted.
          </p>
        </div>

        <button
          type="button"
          onClick={runDemo}
          disabled={running}
          className="shrink-0 rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {running
            ? `${completed}/${STEPS.length}`
            : finished
              ? "Run again"
              : "Run demo"}
        </button>
      </div>

      <div className="mt-5 grid gap-x-6 lg:grid-cols-2">
        {STEPS.map((step, index) => {
          const done = index < completed;
          const active = running && index === completed;
          const open = selectedStep === index;

          return (
            <button
              key={step.title}
              type="button"
              onClick={() =>
                setSelectedStep((value) => (value === index ? null : index))
              }
              className="border-b border-white/[0.06] py-2.5 text-left"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    done
                      ? "border-emerald-300/30 text-emerald-300"
                      : active
                        ? "border-cyan-300/30 text-cyan-300"
                        : "border-white/10 text-white/25"
                  }`}
                >
                  {done ? "✓" : index + 1}
                </div>

                <div
                  className={`text-sm ${
                    done
                      ? "text-emerald-100"
                      : active
                        ? "text-cyan-100"
                        : "text-white/45"
                  }`}
                >
                  {step.title}
                </div>
              </div>

              {open && (
                <div className="ml-8 mt-1 text-[11px] leading-5 text-white/30">
                  {step.detail}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {finished && (
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-emerald-200">
              ✓ DEMO COMPLETE
            </div>

            <div className="mt-1 text-xs text-white/40">
              5 USDC → 5 shares → redeem 2 → 3 shares remain.
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-[10px] uppercase tracking-[0.12em] text-white/25">
              Basket PDA
            </div>

            <div className="mt-1 font-mono text-xs text-emerald-200">
              {VERIFIED_LOCAL_PROOF.basketPda.slice(0, 6)}…
              {VERIFIED_LOCAL_PROOF.basketPda.slice(-6)}
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-[10px] leading-4 text-white/25">
        Verified against a local Solana validator. Full external DEX settlement
        is not claimed by this replay.
      </p>
    </section>
  );
}
