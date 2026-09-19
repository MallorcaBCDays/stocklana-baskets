const demoUrl = "https://youtu.be/jh5KlkgHirs";
const githubUrl = "https://github.com/MallorcaBCDays/stocklana-baskets";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070b] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12rem] top-20 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/20 blur-[120px]" />
        <div className="absolute right-[-10rem] top-28 h-[30rem] w-[30rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
        <a href="#" className="flex items-center gap-3 font-semibold tracking-wide">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            <span className="h-3 w-5 -skew-x-12 rounded-sm bg-gradient-to-r from-fuchsia-500 to-cyan-300" />
          </span>
          <span>
            STOCKLANA <span className="text-cyan-300">BASKETS</span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 text-sm text-white/60 md:flex">
          <a href="#how-it-works" className="transition hover:text-white">How it works</a>
          <a href="#prototypes" className="transition hover:text-white">Prototypes</a>
          <a href="#roadmap" className="transition hover:text-white">Roadmap</a>
        </nav>

        <a
          href={githubUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
        >
          GitHub
        </a>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-14 px-6 py-16 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-20">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-fuchsia-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
            Built on Solana
          </div>

          <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Programmable on-chain index baskets for{" "}
            <span className="bg-gradient-to-r from-fuchsia-300 via-white to-cyan-300 bg-clip-text text-transparent">
              tokenized assets.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            Stocklana Baskets turns weighted portfolios into transparent,
            programmable on-chain primitives with deterministic custody,
            fungible basket shares, pricing adapters, and Jupiter-powered execution.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href={demoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              Explore the Demo
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
            >
              View on GitHub
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/40">
            <span>Core MVP</span>
            <span>•</span>
            <span>Pyth pricing preview</span>
            <span>•</span>
            <span>PreStocks prototype</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-gradient-to-br from-fuchsia-500/25 via-transparent to-cyan-400/25 blur-3xl" />
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/35">Sample basket</p>
                <h2 className="mt-2 text-xl font-semibold">AI + Markets Index</h2>
              </div>
              <div className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1 text-xs text-cyan-200">
                100%
              </div>
            </div>

            <div className="space-y-4 py-6">
              {[
                ["OPENAI", "35%", "from-fuchsia-500 to-purple-400"],
                ["ANTHROPIC", "30%", "from-purple-400 to-indigo-400"],
                ["FIGUREAI", "20%", "from-cyan-400 to-sky-300"],
                ["KALSHI", "15%", "from-teal-400 to-cyan-300"],
              ].map(([name, weight, gradient]) => (
                <div key={name}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-white/85">{name}</span>
                    <span className="font-mono text-white/50">{weight}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
                      style={{ width: weight }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-5 text-center">
              <div className="rounded-2xl bg-white/[0.035] p-3">
                <p className="text-lg font-semibold">1–10</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/35">Assets</p>
              </div>
              <div className="rounded-2xl bg-white/[0.035] p-3">
                <p className="text-lg font-semibold">PDA</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/35">Custody</p>
              </div>
              <div className="rounded-2xl bg-white/[0.035] p-3">
                <p className="text-lg font-semibold">Jupiter</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/35">Execution</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/80">How it works</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            One basket. Multiple assets. Fully programmable.
          </h2>
          <p className="mt-5 text-base leading-7 text-white/55">
            Stocklana combines basket composition, target weights, custody, share issuance,
            allocation logic, and execution into a single programmable architecture on Solana.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["01", "Create", "Define a basket with up to 10 tokenized assets and target weights totaling 100%."],
            ["02", "Deposit", "Deposit the basket input asset into deterministic protocol-controlled custody."],
            ["03", "Mint", "Receive fungible basket shares representing participation in the basket."],
            ["04", "Allocate", "Preview weighted allocations and route execution through Jupiter using basket PDA authority."],
          ].map(([number, title, copy]) => (
            <div
              key={number}
              className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-sm"
            >
              <div className="text-sm font-mono text-fuchsia-300/80">{number}</div>
              <h3 className="mt-5 text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/50">{copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-amber-300/10 bg-amber-300/[0.03] px-5 py-4 text-sm leading-6 text-white/45">
          The current MVP uses simplified 1:1 deposit and redemption accounting. Production
          NAV-based share pricing is part of the next development phase.
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-fuchsia-300/80">Core MVP</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              The basket primitive already works.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/55">
              The Stocklana MVP proves the core on-chain architecture required for programmable
              index baskets on Solana.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
                7/7 Rust tests
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
                7/7 TypeScript tests
              </span>
            </div>

            <a
              href={demoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/5 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
            >
              Watch Core MVP Demo
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Weighted baskets", "1–10 constituents with transparent target weights."],
              ["Basket shares", "Dedicated fungible share mint controlled by the basket."],
              ["Deterministic custody", "PDA-based custody and constituent vault architecture."],
              ["Deposit & redemption", "Tested minting and withdrawal lifecycle."],
              ["Allocation logic", "On-chain weighted allocation calculations."],
              ["Jupiter execution", "CPI execution architecture using basket PDA authority."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                <h3 className="text-base font-semibold text-white/90">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/45">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="prototypes" className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/80">Live prototypes</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Pricing and tokenized-asset integrations, without hard-coding the core.
          </h2>
          <p className="mt-5 text-base leading-7 text-white/55">
            Stocklana keeps the basket primitive separate from pricing providers and asset platforms.
            These experiments show how the architecture can grow while the submitted MVP core stays stable.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-fuchsia-300/15 bg-gradient-to-br from-fuchsia-400/[0.08] via-white/[0.03] to-transparent p-7 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-fuchsia-200/70">Experimental pricing adapter</p>
                <h3 className="mt-3 text-2xl font-semibold">Pyth multi-asset pricing preview</h3>
              </div>
              <span className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/5 px-3 py-1 text-xs text-fuchsia-100">
                Read-only
              </span>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-white/50">
              Live Pyth market data is translated into target dollar values and target asset quantities for a weighted basket.
              The prototype is isolated from the current 1:1 MVP accounting model.
            </p>

            <div className="mt-7 space-y-4">
              {[
                ["TSLA", "35%"],
                ["QQQ", "30%"],
                ["VOO", "25%"],
                ["XAU", "10%"],
              ].map(([name, weight]) => (
                <div key={name}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-white/85">{name}</span>
                    <span className="font-mono text-white/50">{weight}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-purple-400"
                      style={{ width: weight }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="https://github.com/MallorcaBCDays/stocklana-baskets/tree/main/experiments/pyth-nav-preview"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-fuchsia-300/20 bg-fuchsia-300/5 px-5 py-2.5 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-300/10"
              >
                View Pyth prototype
              </a>
            </div>
          </article>

          <article className="rounded-[2rem] border border-cyan-300/15 bg-gradient-to-br from-cyan-400/[0.08] via-white/[0.03] to-transparent p-7 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-200/70">Tokenized private markets</p>
                <h3 className="mt-3 text-2xl font-semibold">PreStocks pre-IPO basket prototype</h3>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1 text-xs text-cyan-100">
                Live API data
              </span>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-6 text-white/50">
              Stocklana combines weighted basket logic with PreStocks token prices, mark prices and real Solana mint addresses
              to model diversified on-chain pre-IPO exposure.
            </p>

            <div className="mt-7 space-y-4">
              {[
                ["OPENAI", "35%"],
                ["ANTHROPIC", "30%"],
                ["FIGUREAI", "20%"],
                ["KALSHI", "15%"],
              ].map(([name, weight]) => (
                <div key={name}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-white/85">{name}</span>
                    <span className="font-mono text-white/50">{weight}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-300"
                      style={{ width: weight }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="https://youtu.be/57ix4yjqBdg"
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-gradient-to-r from-teal-300 to-cyan-300 px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                Watch PreStocks demo
              </a>
              <a
                href="https://github.com/MallorcaBCDays/stocklana-baskets/tree/main/experiments/prestocks-basket-preview"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/75 transition hover:bg-white/10"
              >
                View prototype
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/80">Architecture</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Built as infrastructure, not just an interface.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/55">
              The basket itself is the primitive. Composition, weights, custody structure, share issuance,
              allocation logic, and execution authority live inside the protocol architecture.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/45">
              Pricing and execution layers can evolve independently, so Stocklana does not need to hard-code
              itself to one oracle, one asset platform, or one execution venue.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 sm:p-7">
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.045] p-5 text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">Core primitive</p>
              <p className="mt-2 text-lg font-semibold">Stocklana Basket</p>
            </div>

            <div className="mx-auto h-8 w-px bg-gradient-to-b from-cyan-300/50 to-white/10" />

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Basket State", "Composition + weights"],
                ["Basket Shares", "Fungible participation"],
                ["Custody Vaults", "Deterministic PDAs"],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <p className="text-sm font-semibold text-white/85">{title}</p>
                  <p className="mt-1 text-xs text-white/35">{copy}</p>
                </div>
              ))}
            </div>

            <div className="mx-auto h-8 w-px bg-gradient-to-b from-white/10 to-fuchsia-300/40" />

            <div className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-300/[0.035] p-5 text-center">
              <p className="text-sm font-semibold">Allocation Engine</p>
              <p className="mt-1 text-xs text-white/35">Weighted target calculations</p>
            </div>

            <div className="grid gap-3 pt-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-300/[0.035] p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-fuchsia-200/70">Pricing adapters</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/65">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Pyth</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">PreStocks</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Future adapters</span>
                </div>
              </div>
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-200/70">Execution layer</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/65">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Jupiter CPI</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Solana DEXs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="roadmap" className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-fuchsia-300/80">Roadmap</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            From prototype to production-grade index infrastructure.
          </h2>
          <p className="mt-5 text-base leading-7 text-white/55">
            The MVP proves the core basket architecture. The next phases focus on economic correctness,
            automated portfolio maintenance, stronger execution controls, and a user-facing basket builder.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-5">
          {[
            ["Now", "Core MVP", "Basket creation, custody, shares, allocation logic, deposit/redemption and Jupiter CPI architecture."],
            ["Next", "Real NAV", "Actual constituent balances × verified market prices → basket NAV and share price."],
            ["Next", "Rebalancing", "Detect allocation drift and calculate the trades required to restore target weights."],
            ["Next", "Execution", "Production-grade execution with stronger slippage, MEV, settlement and safety controls."],
            ["Later", "Basket Builder", "A user-facing interface for creating, exploring and managing programmable baskets."],
          ].map(([phase, title, copy], index) => (
            <div key={`${phase}-${title}`} className="relative rounded-3xl border border-white/10 bg-white/[0.03] p5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200/65">{phase}</span>
                <span className="font-mono text-xs text-white/20">0{index + 1}</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/45">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-fuchsia-500/[0.08] via-white/[0.035] to-cyan-400/[0.08] p-8 sm:p-12">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/80">The bigger vision</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
            An index layer for tokenized markets.
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-7 text-white/55 sm:text-lg">
            As more equities, private-market assets, commodities, funds and other real-world assets move on-chain,
            users should not need to manage every asset individually.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/55 sm:text-lg">
            Stocklana Baskets aims to provide the infrastructure for transparent, programmable portfolios
            that can be embedded across the Solana ecosystem.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] px-6 py-12 text-center sm:px-12 sm:py-16">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-fuchsia-300/80">Stocklana Baskets</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Build the basket. Own the exposure.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/50">
            Stocklana Baskets is currently in active prototype development.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={demoUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              Watch the Demo
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <p className="max-w-4xl text-xs leading-5 text-white/30">
            Stocklana Baskets is experimental software under active development. Current prototypes are not
            production-ready and should not be used with assets you cannot afford to lose. References to tokenized
            assets, pricing providers, or integrations do not imply endorsement, partnership, or availability in
            every jurisdiction.
          </p>
          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Stocklana Baskets. Built on Solana.</p>
            <div className="flex gap-5">
              <a href={githubUrl} target="_blank" rel="noreferrer" className="transition hover:text-white/70">GitHub</a>
              <a href={demoUrl} target="_blank" rel="noreferrer" className="transition hover:text-white/70">Demo</a>
            </div>
          </div>
        </div>
      </footer>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/80">Architecture</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Built as infrastructure, not just an interface.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/55">
              The basket itself is the primitive. Composition, weights, custody structure, share issuance,
              allocation logic, and execution authority live inside the protocol architecture.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/45">
              Pricing and execution layers can evolve independently, so Stocklana does not need to hard-code
              itself to one oracle, one asset platform, or one execution venue.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 sm:p-7">
            <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.045] p-5 text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">Core primitive</p>
              <p className="mt-2 text-lg font-semibold">Stocklana Basket</p>
            </div>

            <div className="mx-auto h-8 w-px bg-gradient-to-b from-cyan-300/50 to-white/10" />

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Basket State", "Composition + weights"],
                ["Basket Shares", "Fungible participation"],
                ["Custody Vaults", "Deterministic PDAs"],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <p className="text-sm font-semibold text-white/85">{title}</p>
                  <p className="mt-1 text-xs text-white/35">{copy}</p>
                </div>
              ))}
            </div>

            <div className="mx-auto h-8 w-px bg-gradient-to-b from-white/10 to-fuchsia-300/40" />

            <div className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-300/[0.035] p-5 text-center">
              <p className="text-sm font-semibold">Allocation Engine</p>
              <p className="mt-1 text-xs text-white/35">Weighted target calculations</p>
            </div>

            <div className="grid gap-3 pt-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-fuchsia-300/15 bg-fuchsia-300/[0.035] p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-fuchsia-200/70">Pricing adapters</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/65">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Pyth</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">PreStocks</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Future adapters</span>
                </div>
              </div>
              <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.035] p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-200/70">Execution layer</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/65">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Jupiter CPI</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Solana DEXs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="roadmap" className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-fuchsia-300/80">Roadmap</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            From prototype to production-grade index infrastructure.
          </h2>
          <p className="mt-5 text-base leading-7 text-white/55">
            The MVP proves the core basket architecture. The next phases focus on economic correctness,
            automated portfolio maintenance, stronger execution controls, and a user-facing basket builder.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-5">
          {[
            ["Now", "Core MVP", "Basket creation, custody, shares, allocation logic, deposit/redemption and Jupiter CPI architecture."],
            ["Next", "Real NAV", "Actual constituent balances × verified market prices → basket NAV and share price."],
            ["Next", "Rebalancing", "Detect allocation drift and calculate the trades required to restore target weights."],
            ["Next", "Execution", "Production-grade execution with stronger slippage, MEV, settlement and safety controls."],
            ["Later", "Basket Builder", "A user-facing interface for creating, exploring and managing programmable baskets."],
          ].map(([phase, title, copy], index) => (
            <div key={`${phase}-${title}`} className="relative rounded-3xl border border-white/10 bg-white/[0.03] p5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200/65">{phase}</span>
                <span className="font-mono text-xs text-white/20">0{index + 1}</span>
              </div>
              <h3 className="mt-6 text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/45">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-fuchsia-500/[0.08] via-white/[0.035] to-cyan-400/[0.08] p-8 sm:p-12">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-300/80">The bigger vision</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
            An index layer for tokenized markets.
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-7 text-white/55 sm:text-lg">
            As more equities, private-market assets, commodities, funds and other real-world assets move on-chain,
            users should not need to manage every asset individually.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/55 sm:text-lg">
            Stocklana Baskets aims to provide the infrastructure for transparent, programmable portfolios
            that can be embedded across the Solana ecosystem.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] px-6 py-12 text-center sm:px-12 sm:py-16">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-fuchsia-300/80">Stocklana Baskets</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Build the basket. Own the exposure.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/50">
            Stocklana Baskets is currently in active prototype development.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={demoUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              Watch the Demo
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <p className="max-w-4xl text-xs leading-5 text-white/30">
            Stocklana Baskets is experimental software under active development. Current prototypes are not
            production-ready and should not be used with assets you cannot afford to lose. References to tokenized
            assets, pricing providers, or integrations do not imply endorsement, partnership, or availability in
            every jurisdiction.
          </p>
          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Stocklana Baskets. Built on Solana.</p>
            <div className="flex gap-5">
              <a href={githubUrl} target="_blank" rel="noreferrer" className="transition hover:text-white/70">GitHub</a>
              <a href={demoUrl} target="_blank" rel="noreferrer" className="transition hover:text-white/70">Demo</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
