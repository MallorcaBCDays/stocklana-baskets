# Stocklana Baskets — Jury Demo Script

## Goal

Show the stable, reproducible Stocklana MVP flow live without depending on fragile cloned-localnet DEX settlement.

## Opening

> Stocklana Baskets lets users create weighted on-chain index baskets of tokenized assets on Solana. Each basket has transparent constituents and weights, its own basket shares, deterministic custody vaults, and a Jupiter CPI path verified on a local validator.

> For this demo, I’ll show the deterministic core flow live, and then briefly show how the locally verified Jupiter CPI path reaches external DEX programs.

## Live demo command

```bash
npx ts-node scripts/demo.ts
```

## What to say during the demo

### 1. Create weighted basket

> We create an on-chain basket called AI Basket. The basket has its own deterministic PDA, basket-share mint, and stablecoin vault.

### 2. Show weights

> The basket contains four constituents weighted 40%, 25%, 20%, and 15%. The weights total exactly 100%.

### 3. Create constituent vault

> Each constituent can have a deterministic token vault controlled by the basket PDA. This gives the basket program-controlled custody for the assets that back the index.

### 4. Prepare user balance

> For this local demo, the user starts with 10 test USDC.

### 5. Deposit and mint basket shares

> The user deposits 5 test USDC and receives 5 basket shares.

> This MVP currently uses simplified 1:1 raw-amount accounting. Production NAV-based pricing is intentionally not claimed yet.

### 6. Redeem basket shares

> The user redeems 2 basket shares. Those shares are burned, and 2 test USDC are returned.

> After redemption, the user has 7 USDC, the basket vault has 3 USDC, and the user has 3 basket shares.

### 7. Allocation preview

> We now preview how a 5-unit allocation would be distributed according to the basket weights.

Expected result:

- 40% -> 2.000000
- 25% -> 1.250000
- 20% -> 1.000000
- 15% -> 0.750000
- Total -> 5.000000

> The allocation is calculated on-chain and matches the basket weights exactly.

### 8. Jupiter execution path

> Stocklana also implements a Jupiter CPI path for basket swaps.

> On a local validator, we verified the path from Stocklana into Jupiter and onward into external DEX programs. It has not been executed on a public cluster.

> For the live jury demo, we intentionally do not depend on full DEX settlement on cloned localnet state, because production DEXes can depend on live pool state, slots, oracle state, liquidity state, and other dynamic mainnet conditions.

## Important wording

Safe claim:

> On a local validator, Stocklana successfully constructs and executes the real CPI path into Jupiter, and Jupiter reaches external DEX programs.

Do not claim:

> Full Jupiter DEX settlement passes locally.

## Closing

> Stocklana Baskets provides a programmable on-chain index primitive on Solana: transparent weights, deterministic custody, fungible basket shares, deposit and redemption flows, weighted allocation logic, and a Jupiter CPI path verified on a local validator.

## Demo checklist

Before presenting:

- Terminal 1: work terminal
- Terminal 2: local validator
- Validator running
- Stocklana program deployed
- Solana CLI pointed at `http://127.0.0.1:8899`
- Run `npx ts-node scripts/demo.ts`
- Confirm the script ends with `DEMO COMPLETE`
