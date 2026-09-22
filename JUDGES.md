# Stocklana Baskets — Judges Guide

**Programmable on-chain index baskets for tokenized assets on Solana.**

## Start here

- Interactive demo: https://demo.stocklanabaskets.com
- Website: https://stocklanabaskets.com
- Main demo video: https://youtu.be/jh5KlkgHirs
- Program ID: `5p7G79qSFHWFKiqK2LjeMLFWpPPATNxBroZnv8Do3QZB`

## Live Devnet proof

### Jury setup — Solana Devnet only

The demo provides two separate proof paths:

- **Jury Demo:** replays a verified local Anchor run and submits no transaction.
- **Live Devnet Proof:** connects a real wallet and submits a real Devnet `depositAndMint` transaction.

Before using the Live Devnet Proof:

1. Use Phantom and switch the wallet to **Solana Devnet**.
2. Get Devnet SOL for transaction fees: https://faucet.solana.com/
3. Get at least 1 Circle Devnet USDC: https://faucet.circle.com/
4. In the Circle faucet, select **Solana Devnet** and enter the wallet address.

Permanent Devnet identifiers:

- Circle Devnet USDC mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
- Basket PDA: `2DiKcr2mudaw9KpJ1PzjGzS3XbCCfMvUsSKMteAWmN5N`
- Basket share mint: `4Du3IzrcLU5nQMDjouBUApDYyjHBH2eazU2aC4GqTTYC`

No mainnet assets are involved. Current deposit accounting is simplified
1:1 raw amount accounting; production NAV pricing and portfolio-backed
settlement are not implemented yet.

Stocklana is deployed on Solana Devnet and the wallet flow has been executed from the browser with Phantom.

Verified flow:

1. Connect wallet
2. Read Circle Devnet USDC balance
3. Deposit 1 USDC
4. Call Stocklana `depositAndMint`
5. Mint 1 Stocklana basket share
6. Confirm transaction on Solana Devnet
7. Refresh balances in the UI

Verified balance change:

- Circle Devnet USDC: `20.00 -> 19.00`
- Stocklana basket shares: `0.00 -> 1.00`

Successful finalized Devnet transaction:

`34nZzjP3bQ2qwBYFuxewa87uaqgYMhrue3u6SgeKJkChY2iiDYqBY1E3SCjRdqBKtr2t3i3wKrdit4oGuXgbBKgL`

Explorer:

https://explorer.solana.com/tx/34nZzjP3bQ2qwBYFuxewa87uaqgYMhrue3u6SgeKJkChY2iiDYqBY1E3SCjRdqBKtr2t3i3wKrdit4oGuXgbBKgL?cluster=devnet

The transaction is finalized successfully on Solana Devnet.

## Live-domain wallet verification

The wallet flow was also executed successfully after deployment on:

https://demo.stocklanabaskets.com

Verified live-demo balance change:

- Circle Devnet USDC: `19.00 -> 18.00`
- Stocklana basket shares: `1.00 -> 2.00`

Finalized Devnet transaction:

`4puXzwtF8Xg2vnsvVq7efLi2D4dobFAKfMkUCCDxWz737qQMAiEBPDoEgZGsqknSih2UEUVwwabMdX7WdEGnJ43D`

Explorer:

https://explorer.solana.com/tx/4puXzwtF8Xg2vnsvVq7efLi2D4dobFAKfMkUCCDxWz737qQMAiEBPDoEgZGsqknSih2UEUVwwabMdX7WdEGnJ43D?cluster=devnet

## Core MVP

The Anchor program currently supports:

- weighted basket initialization
- 1–10 constituents
- weights totaling exactly 10,000 bps
- deterministic basket PDAs
- fungible basket-share mint
- deterministic constituent vaults
- `depositAndMint`
- `redeemAndWithdraw`
- weighted allocation preview
- Jupiter CPI execution infrastructure

Verified test status:

- Rust: **7 passed, 0 failed**
- TypeScript: **7 passing, 0 failing**

## Important MVP boundary

Current deposit/redemption accounting uses a simplified **1:1 raw amount model**.

Example:

- deposit 1 USDC
- mint 1 basket share

Production NAV-based share pricing is not implemented yet.

Also not yet production-ready:

- portfolio-backed redemption
- automated rebalancing
- audited production deployment
- production-grade public-cluster DEX settlement

The UI states these limitations explicitly.

## Jupiter execution

Stocklana contains real Jupiter CPI infrastructure.

Verified execution path:

`Stocklana -> Jupiter -> external DEX program`

Local cloned-validator tests reached Jupiter and external DEX programs. Reliable full external DEX settlement is not claimed for the cloned local-validator environment.

## Experimental integrations

### Pyth basket pricing preview

Read-only prototype showing Stocklana as an oracle-agnostic basket protocol with Pyth as the first pricing adapter.

Video:

https://youtu.be/IEbl-2HDGFE

### PreStocks basket preview

Read-only prototype exploring programmable pre-IPO baskets using PreStocks data.

Video:

https://youtu.be/57ix4yjqBdg

## What to try

For the fastest product walkthrough:

1. Open the interactive demo.
2. Run the verified jury replay.
3. Connect a Solana wallet.
4. Switch the wallet to Devnet.
5. Fund it with Devnet SOL and Circle Devnet USDC.
6. Use **Deposit 1 USDC**.
7. Confirm the transaction.
8. Observe the USDC balance decrease and Stocklana basket-share balance increase.
9. Open the generated Solana Explorer link.

No mainnet assets are involved in this demo.
