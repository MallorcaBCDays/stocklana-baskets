# Stocklana Baskets

**Programmable on-chain index baskets for tokenized assets on Solana.**

Stocklana Baskets is an Anchor-based protocol for transparent weighted baskets of tokenized assets with deterministic custody, fungible basket shares, weighted allocation logic, and a Jupiter CPI path verified on a local validator.

**Featured use case:** the **AI + Markets Index**, a read-only PreStocks-powered pre-IPO basket preview (OpenAI 35%, Anthropic 30%, Figure AI 20%, Kalshi 15%). It prices the basket from PreStocks data; basket shares are not backed by these tokens. The protocol itself stays asset-agnostic.

## Start here

- **Interactive Demo:** https://demo.stocklanabaskets.com
- **Judges Guide:** [JUDGES.md](JUDGES.md)
- **Website:** https://stocklanabaskets.com
- **Main Demo Video:** https://youtu.be/jh5KlkgHirs
- **Devnet proof (fresh wallet):** https://explorer.solana.com/tx/2t5ByBvLi3DJMDZTv6VCSZw5Qqxo6dFvVLKwjHDcEwGef9oYYE4niwomH6bhQ81ZGy3dRvaE5CEW1gaKVTaQkTYF?cluster=devnet
- **GitHub:** https://github.com/MallorcaBCDays/stocklana-baskets

> The interactive demo has two proof paths: the **Jury Demo** replays a verified local Anchor run and does not submit new transactions, while the **Live Devnet Proof** can connect a wallet and execute a real `depositAndMint` transaction against the deployed Stocklana program on Solana Devnet.

## Program ID

`5p7G79qSFHWFKiqK2LjeMLFWpPPATNxBroZnv8Do3QZB`

Deployed on Solana Devnet; the same program ID is used for local development.

Explorer (Devnet): https://explorer.solana.com/address/5p7G79qSFHWFKiqK2LjeMLFWpPPATNxBroZnv8Do3QZB?cluster=devnet

Devnet accounts of the live demo basket:

| Account | Address |
| --- | --- |
| Basket PDA | `2DiKcr2mudaw9KpJ1PzJGzS3XbCCfMvUsSKMteAWmN5N` |
| Basket share mint | `4Du31zrcLU5nQMDjouBUApDYyjHBH2eazU2aC4GqTTYC` |
| Stablecoin vault | `CBdEneZiAj4jbKQPBpc9K2Aj6yzpQXPaoRVCzH9oiRUu` |
| Circle Devnet USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

## Core MVP

- 1–10 weighted constituents
- deterministic Basket PDA and custody vaults
- dedicated basket share mint
- deposit and redemption lifecycle
- live `depositAndMint` on Solana Devnet
- weighted allocation previews
- Jupiter CPI path, verified on a local validator (full DEX settlement not claimed)
- 7/7 Rust tests and 7/7 TypeScript tests

> Current MVP accounting is intentionally simplified 1:1 raw-amount accounting. Production NAV-based share pricing, portfolio-backed redemption, automated rebalancing, and audited production deployment are future work.

---

## Experimental integrations

These integrations are isolated, read-only prototypes and do not change the Core MVP accounting model.

### Pyth Basket Pricing Preview

`experiments/pyth-nav-preview/`

Multi-asset pricing preview using:

- TSLA — 35%
- QQQ — 30%
- VOO — 25%
- XAU — 10%

Pyth market prices are used to calculate target values and target asset quantities. This is a pricing preview, not production NAV.

### AI + Markets Index — a read-only PreStocks-powered pre-IPO basket preview

`experiments/prestocks-basket-preview/`

Basket weights:

- OPENAI — 35%
- ANTHROPIC — 30%
- FIGUREAI — 20%
- KALSHI — 15%

The prototype script reads live PreStocks API data and real Solana mint addresses. The interactive demo shows a verified snapshot of that data.

**PreStocks Demo Video:** https://youtu.be/57ix4yjqBdg

---
## Why Stocklana?

Tokenized equities and other real-world assets can exist as individual Solana tokens, but users often want diversified exposure rather than managing many positions manually.

Stocklana is designed around a simple idea:

> **A basket is an on-chain index primitive whose composition, weights, custody and execution logic are transparent and programmable.**

A basket can define up to 10 constituent assets with weights expressed in basis points. The weights must sum to 10,000 bps (100%).

Example:

| Asset | Weight |
| --- | ---: |
| Asset A | 40.00% |
| Asset B | 25.00% |
| Asset C | 20.00% |
| Asset D | 15.00% |

For a 5,000,000-unit input amount, the allocation engine produces:

| Asset | Allocation |
| --- | ---: |
| Asset A | 2,000,000 |
| Asset B | 1,250,000 |
| Asset C | 1,000,000 |
| Asset D | 750,000 |

Integer rounding is assigned to the final constituent so that the total allocation always equals the original amount.

---

## Architecture

```text
User
  |
  | deposit / redeem
  v
+-----------------------------+
|       Stocklana Basket      |
|        Basket PDA           |
+-----------------------------+
       |              |
       |              +----------------------+
       |                                     |
       v                                     v
Basket Share Mint                  Input / Stablecoin Vault
                                      |
                                      | allocation + swap
                                      v
                              Basket Stablecoin ATA
                                      |
                                      | Jupiter CPI
                                      v
                               Jupiter Swap Program
                                      |
                    +-----------------+-----------------+
                    |                 |                 |
                    v                 v                 v
             Constituent 0      Constituent 1      Constituent N
                 Vault              Vault              Vault
```

The basket PDA acts as the on-chain authority for basket-controlled token accounts.

The Jupiter branch of this diagram has been verified on a local validator up to external DEX programs. It has not been executed on a public cluster; the Devnet deployment covers deposit and minting.

---

## Core Program Features

### Basket creation

`initialize_basket(name, basket_id, constituents)`

Creates a deterministic basket PDA and stores:

- basket creator
- basket ID
- basket share mint
- input / stablecoin mint
- input / stablecoin vault
- basket name
- constituent mints
- constituent weights
- PDA bump

Rules enforced on-chain:

- minimum 1 constituent
- maximum 10 constituents
- total constituent weight must equal exactly 10,000 bps

### Basket share mint

Each basket has its own deterministic share mint.

The current MVP uses a **6-decimal basket share mint**.

### Deposit and mint

`deposit_and_mint(deposit_amount)`

The MVP currently:

1. transfers the input/stablecoin token from the user into the basket vault
2. mints an equal raw amount of basket shares to the user

This is intentionally a simplified **1:1 MVP accounting model**.

A production version should mint shares based on basket NAV rather than raw deposited units.

### Redeem and withdraw

`redeem_and_withdraw(share_amount)`

The MVP currently:

1. burns the user's basket shares
2. transfers the corresponding raw input/stablecoin amount back to the user

This is also part of the simplified 1:1 MVP model.

### Weighted allocation engine

`calculate_allocations(deposit_amount, constituents)`

Allocations are calculated using basis points.

The final constituent receives any integer rounding remainder so the sum of all allocations exactly equals the original input amount.

### Allocation preview

`preview_allocations(amount)`

Logs the target allocation for every constituent without performing swaps.

### Constituent vaults

`initialize_constituent_vault(index)`

Each constituent receives a deterministic token vault derived from:

```text
["constituent_vault", basket_pda, constituent_index]
```

The basket PDA is the vault authority.

### Jupiter swap preparation

`prepare_constituent_swap(index, input_amount)`

Validates:

- constituent index
- constituent mint
- constituent vault
- input/stablecoin vault
- target allocation

### Jupiter CPI execution

`execute_constituent_swap(...)`

Stocklana can construct and invoke Jupiter swap instructions through CPI. This path is verified on a local validator (see *Localnet limitation* below).

The program currently validates:

- Jupiter program ID
- allowed Jupiter instruction discriminators
- basket PDA authority presence
- writable source vault presence
- writable constituent vault presence
- input amount bounds
- post-CPI source balance movement
- post-CPI destination balance movement
- minimum output amount

Supported Jupiter instruction families currently include:

- `route`
- `shared_accounts_route`
- `route_v2`
- `shared_accounts_route_v2`

For the inner Jupiter CPI, the basket PDA is promoted to signer and signed with `invoke_signed`.

---

## Jupiter Integration

Stocklana is designed to use Jupiter as its execution layer rather than implementing DEX-specific routing itself. All Jupiter results below come from a local validator with cloned mainnet state.

The local integration harness:

```text
scripts/jupiter-e2e.ts
```

supports two modes:

```bash
MODE=plan
MODE=execute
```

### Plan mode

Plan mode requests a Jupiter route and verifies:

- the Stocklana source account is present
- the Stocklana destination account is present
- setup instructions are compatible
- the route instruction can be passed to the basket program

The local harness currently excludes **Quantum** because its cloned mainnet state was not reliably reproducible in a local validator.

### Execute mode

Execute mode prepares:

- basket PDA
- constituent vault
- basket WSOL account
- user WSOL
- Jupiter setup instructions

It then executes the real:

```text
Stocklana -> Jupiter -> selected DEX
```

CPI path.

### Localnet limitation

The Stocklana -> Jupiter CPI path has been reached successfully all the way into external DEX programs.

A completely successful DEX swap is not guaranteed on a cloned local validator because many production DEX programs depend on live or tightly coupled mainnet state, including pool state, slot/time assumptions, oracle state, liquidity state or other dynamically changing accounts.

For that reason, this repository does **not** claim that a full production Jupiter swap is reproducible on localnet.

The important verified behavior is:

```text
Stocklana instruction
    -> Jupiter CPI
        -> SPL Token instructions
            -> selected DEX program
```

For production integration, this path should be validated on an appropriate public cluster with real supported assets and live Jupiter routing.

---

## Tests

### Rust unit tests

The Rust test suite currently covers:

- standard Jupiter `route` discriminator
- standard Jupiter `shared_accounts_route` discriminator
- Jupiter `route_v2` discriminator
- Jupiter `shared_accounts_route_v2` discriminator
- weighted allocation calculation
- rounding remainder handling
- rejection of unknown Jupiter instructions

Current result:

```text
7 passed
0 failed
```

Run:

```bash
cargo test -p basket-vault
```

### Anchor / TypeScript integration tests

The TypeScript suite covers:

- weighted allocation preview
- constituent vault creation
- constituent swap preparation
- rejection of unknown Jupiter instructions before CPI
- deposit + share minting
- redemption + withdrawal
- invalid weight rejection
- maximum constituent validation

The currently maintained suite has been run successfully with:

```text
7 passing
0 failing
```

Run:

```bash
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts
```

---

## Build

This project has been built successfully with:

```bash
anchor build --tools-version v1.52 --arch v2
```

For this repository, use that command rather than relying on the default Anchor build toolchain.

Rust unit tests:

```bash
cargo test -p basket-vault
```

TypeScript integration tests:

```bash
npx ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts
```

---

## Local Development

### Requirements

The development environment used for the MVP includes:

```text
Solana CLI 3.1.10
Anchor CLI 1.2.0
Node.js / npm
Rust / Cargo
```

Install project dependencies:

```bash
npm install
```

### Useful environment variables

```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"
export ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
export ANCHOR_WALLET=$HOME/.config/solana/id.json
```

### Basic local validator

```bash
solana-test-validator
```

### Deploy to local validator

After building:

```bash
anchor program deploy target/deploy/basket_vault.so
```

---

## Program ID and redeployment

The same program ID is used on Solana Devnet and for local development:

```text
5p7G79qSFHWFKiqK2LjeMLFWpPPATNxBroZnv8Do3QZB
```

If the program is redeployed under a new keypair or to another cluster, update the relevant Anchor configuration and client references accordingly.

---

## Repository Structure

```text
.
├── programs/basket-vault/          Anchor program (src/lib.rs)
├── tests/basket-vault.ts           Anchor / TypeScript integration tests
├── scripts/
│   ├── demo.ts                     local jury demo flow
│   ├── devnet-smoke.ts             Devnet deposit smoke test
│   ├── setup-wallet-demo.ts        Devnet wallet-demo basket setup
│   ├── jupiter-swap.ts
│   └── jupiter-e2e.ts              local Jupiter CPI harness
├── app/                            interactive demo (demo.stocklanabaskets.com)
├── website/                        landing page (stocklanabaskets.com)
├── experiments/
│   ├── prestocks-basket-preview/   AI + Markets Index pricing (read-only)
│   └── pyth-nav-preview/           Pyth pricing preview (read-only)
├── docs/                           submission texts, jury demo script
├── JUDGES.md
├── Anchor.toml
├── Cargo.toml
├── package.json
├── tsconfig.json
└── README.md
```

---

## Security Design

The MVP already includes several defensive checks around external execution.

### Jupiter program restriction

The program does not accept an arbitrary external program as the swap executor. The Jupiter program ID is validated on-chain.

### Instruction allowlist

Only recognized Jupiter route instruction discriminators are accepted.

Unknown Jupiter instructions are rejected before CPI.

### Source and destination account checks

The Jupiter account list must contain the expected Stocklana-controlled source and destination accounts with the expected writable permissions.

### PDA signing

The basket PDA never has a private key.

When Jupiter requires the basket authority as an inner signer, Stocklana signs through:

```text
invoke_signed
```

using the basket PDA seeds.

### Post-swap balance checks

After Jupiter returns, Stocklana reloads token accounts and verifies:

- source balance did not increase unexpectedly
- destination balance did not decrease
- some input was actually spent
- spent amount did not exceed the configured maximum
- received amount satisfies `minimum_out`

These checks reduce the trust placed in externally supplied route data.

---

## MVP Limitations

The current implementation is a **technical MVP**, not a production asset-management protocol.

Important limitations include:

- share minting is still based on a simplified 1:1 raw-token model
- redemption currently returns the input/stablecoin asset rather than unwinding an invested portfolio
- no production NAV calculation
- no on-chain oracle integration (Pyth and PreStocks pricing are read-only off-chain prototypes)
- no automated rebalancing
- no management or performance fee system
- no constituent asset list is hardcoded into the protocol
- no production slippage policy beyond `minimum_out`
- no MEV protection layer
- no governance system
- no emergency pause / recovery framework
- no formal security audit
- no production mainnet deployment process
- full external DEX execution is not guaranteed to reproduce on cloned localnet state
- Jupiter CPI has not been executed on a public cluster; the Devnet deployment covers deposit and minting

These are intentionally separated from the MVP core.

---

## Production Roadmap

A production version would likely add:

1. **NAV-based share accounting**  
   Basket shares should represent proportional ownership of current portfolio NAV.

2. **Oracle / pricing integration**  
   Reliable pricing for every constituent and the basket as a whole.

3. **Portfolio-backed redemption**  
   Redemption should unwind or transfer proportional underlying assets rather than rely on a simple input-token reserve.

4. **Rebalancing**  
   Permissioned, automated or governance-controlled rebalancing toward target weights.

5. **Production Jupiter routing**  
   Public-cluster testing with real supported assets, route freshness rules and hardened transaction construction.

6. **Fees**  
   Optional basket creation, management, swap or performance fees.

7. **Security hardening**  
   Additional invariant testing, fuzzing, adversarial tests and external audit.

8. **Operational controls**  
   Upgrade policy, pause controls, monitoring and incident procedures.

9. **Basket Builder**
   A user-facing interface for creating, discovering and managing baskets, extending the current interactive demo with redemption and portfolio analytics.

---

## Suggested Demo Flow

For a stable submission demo, use the deterministic core rather than relying on a live external DEX route.

Recommended sequence:

```text
1. Create a basket
2. Show its constituent mints and weights
3. Preview allocations
4. Create a constituent vault
5. Deposit the input asset
6. Show basket shares minted
7. Redeem part of the shares
8. Show balances after redemption
9. Show the Jupiter integration code / E2E route planner
10. Explain the locally verified Stocklana -> Jupiter -> DEX CPI path
```

This demonstrates the complete basket lifecycle while keeping the live demo reproducible.

---

## Submission Summary

**Stocklana Baskets** demonstrates a programmable index-basket primitive on Solana.

The MVP proves the core mechanics required for a future tokenized-equity index product:

- deterministic basket state
- weighted portfolios
- constituent custody
- fungible basket shares
- deposit / redemption lifecycle
- allocation math
- Jupiter CPI path verified on a local validator
- PDA-controlled external CPI
- route and balance safety checks

The next major step is moving from the simplified accounting model to true portfolio NAV accounting and validating execution with live supported tokenized assets on a public Solana cluster.

---

## Disclaimer

This repository is experimental software created as an MVP.

It is not audited, not production-ready and should not be used to manage real funds without additional engineering, testing, security review and operational safeguards.
