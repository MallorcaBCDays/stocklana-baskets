# Stocklana Baskets

Composable onchain index baskets for tokenized stocks on Solana.

Built for the **Solana Stocklana Hackathon**.

## Idea

Stocklana Baskets lets anyone create a weighted basket of xStocks and represent that basket with a single token.

A user can:

* Define a set of xStocks
* Choose portfolio weights
* Deposit USDC
* Receive one basket token representing the portfolio
* Redeem the basket token for the underlying assets

The goal is to make creating an index on Solana as simple as creating a transaction.

## Example

An AI basket could contain:

* 40% NVDAx
* 25% MSFTx
* 20% METAx
* 15% AMZNx

A user deposits USDC, the protocol acquires the underlying xStocks, and the user receives a single basket token representing their share of the vault.

## Why Solana?

Tokenized equities become much more powerful when they are composable.

Instead of only holding individual stocks, onchain baskets can eventually be:

* traded
* transferred
* used as collateral
* integrated into DeFi protocols
* composed into other financial products

## Planned Stack

* Solana
* Anchor / Rust
* Token-2022
* xStocks
* Jupiter
* TypeScript
* Next.js

## MVP

For the hackathon, the goal is to support:

1. Create a basket
2. Define xStock constituents and weights
3. Deposit assets into a basket vault
4. Mint basket shares
5. Display basket holdings and NAV
6. Redeem basket shares

## Status

🚧 Work in progress for the Solana Stocklana Hackathon.

## Disclaimer

This project is a hackathon prototype and is not intended to provide investment, legal, or financial advice.
