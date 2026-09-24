# Stocklana — AI + Markets Index: a read-only PreStocks-powered pre-IPO basket preview

This directory contains an isolated proof-of-concept for using live PreStocks market data with Stocklana Baskets.

The experiment is intentionally separated from the main Stocklana protocol and does **not** modify the submitted MVP core.

## Goal

The prototype demonstrates how Stocklana can combine:

1. weighted basket definitions
2. live PreStocks API data
3. real Solana mint addresses
4. target allocation calculations

to model the AI + Markets Index, a read-only PreStocks-powered pre-IPO basket preview.

## Demo Basket

| Asset | Weight |
|---|---:|
| OPENAI | 35% |
| ANTHROPIC | 30% |
| FIGUREAI | 20% |
| KALSHI | 15% |
| **Total** | **100%** |

Reference notional:

```text
$100
```

## Data Used

For each asset, the preview reads these fields from the PreStocks API:

- `symbol`
- `contract_address`
- `tokenPrice`
- `markPrice`

The script uses `tokenPrice` as the basis for target-unit calculations and displays `markPrice` separately for reference.

```text
target value = reference notional × basket weight
target units = target value / tokenPrice
```

## What the Prototype Demonstrates

```text
Stocklana basket weights
        +
PreStocks API data
        ↓
Target dollar allocations
        ↓
Target token quantities
        +
Real Solana mint addresses
```

This provides a concrete path toward future private-market basket products on Solana.

## Important Scope

This is a **read-only integration prototype**.

It does not change:

- basket creation
- deposit and mint logic
- redemption
- Jupiter CPI execution
- the Anchor program
- current MVP tests
- the current simplified 1:1 accounting model

It should not be described as production-ready NAV accounting or portfolio-backed settlement.

## Run

From the repository root:

```bash
node experiments/prestocks-basket-preview/pricing-preview.mjs
```

The preview prints:

- current `tokenPrice`
- current `markPrice`
- target dollar value
- target token quantity
- Solana mint address for each constituent

Actual prices may change between runs because they are retrieved from the live PreStocks API.

## Example Output Structure

```text
STOCKLANA — PRESTOCKS PRE-IPO BASKET PREVIEW

Reference notional: $100.00

Asset       Weight   Token Price   Mark Price   Target Value   Target Units
OPENAI        35%        ...           ...         $35.00          ...
ANTHROPIC     30%        ...           ...         $30.00          ...
FIGUREAI      20%        ...           ...         $20.00          ...
KALSHI        15%        ...           ...         $15.00          ...

Total weight: 100%
Total target allocation: $100.00
```

The script also prints the current PreStocks Solana mint address for every basket constituent.

## Why This Matters for Stocklana

The existing Stocklana MVP proves the core on-chain basket architecture:

- weighted basket state
- fungible basket shares
- deterministic custody
- deposit and redemption flows
- allocation logic
- a Jupiter CPI path verified on a local validator

This PreStocks prototype shows how that architecture can be extended toward weighted baskets of tokenized pre-IPO exposure using live asset metadata, prices, and Solana mint addresses.

## Status

```text
PreStocks API retrieval: PASS
Four-asset basket lookup: PASS
Live tokenPrice data: PASS
Live markPrice data: PASS
Solana mint retrieval: PASS
Weighted target allocation: PASS
Stocklana core modifications: NONE
```

This directory is experimental and is not production-ready.
