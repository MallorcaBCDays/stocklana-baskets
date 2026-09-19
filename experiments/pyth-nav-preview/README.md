# Stocklana — Pyth Multi-Asset Pricing Preview

This directory contains an isolated proof-of-concept for using Pyth market data with Stocklana Baskets.

The experiment is intentionally separated from the main Stocklana protocol. It does not modify basket creation, deposit/mint, redemption, Jupiter CPI execution, the Anchor program, or the existing MVP tests.

## Goal

The prototype demonstrates how Stocklana can combine programmable basket weights with external market prices to calculate target asset allocations, while keeping the protocol core oracle-agnostic.

Pyth is the first experimental pricing adapter.

## Demo Basket

| Asset | Weight |
|---|---:|
| TSLA | 35% |
| QQQ | 30% |
| VOO | 25% |
| XAU | 10% |
| **Total** | **100%** |

Reference notional: **$100**

The script calculates:

```text
target value = reference notional × basket weight
target units = target value / current asset price
```

## What It Demonstrates

```text
Stocklana basket weights
        +
Pyth market prices
        ↓
Target asset values
        ↓
Target asset quantities
```

This is a building block for future indicative valuation, NAV calculation, execution sizing, rebalancing, and portfolio-backed minting/redemption.

## Important Scope

This is a **read-only pricing prototype**.

It does not change Stocklana's current MVP accounting, which still uses simplified 1:1 raw-amount accounting for deposit and redemption.

This prototype should therefore not be described as production NAV accounting. A production implementation would need verified prices plus actual constituent balances held by basket vaults.

## Oracle Architecture

```text
Stocklana
   ↓
Pricing Adapter
   ↓
Pyth Adapter | Oracle B | Oracle C
```

The long-term design is intended to remain oracle-agnostic.

## Files

- `check-hermes.mjs` — tests authentication and retrieves a Pyth price feed.
- `pricing-preview.mjs` — discovers configured feeds, retrieves prices through Hermes, and calculates target allocations.

## Setup

```bash
npm install
read -s -p "Pyth API key: " PYTH_API_KEY; echo; export PYTH_API_KEY
```

Never commit the API key. `.gitignore` excludes `.env`, `.env.*`, `node_modules/`, and `dist/`.

## Run

Connection test:

```bash
node check-hermes.mjs
```

Pricing preview:

```bash
node pricing-preview.mjs
```

The pricing preview prints live Pyth prices, target values, and target units for the four-asset basket.

## Status

```text
Pyth API connection: PASS
Market feed discovery: PASS
Multi-asset pricing: PASS
Weighted target allocation: PASS
Stocklana core modifications: NONE
```

This directory is experimental and is not production-ready.
