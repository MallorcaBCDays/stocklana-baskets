# Stocklana Baskets — Judges Guide

**Programmable on-chain index baskets for tokenized assets on Solana.**

## Start here

- Interactive demo: https://demo.stocklanabaskets.com
- Website: https://stocklanabaskets.com
- Main demo video: https://youtu.be/jh5KlkgHirs
- Program ID: `5p7G79qSFHWFKiqK2LjeMLFWpPPATNxBroZnv8Do3QZB`

## Live Devnet proof

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
