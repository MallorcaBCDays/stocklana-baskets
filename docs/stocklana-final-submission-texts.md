# Stocklana Baskets — Final Submission Texts

## 1. Short Project Description / One-liner

**Stocklana Baskets is an on-chain index basket protocol on Solana, demonstrated through the AI + Markets Index, a read-only PreStocks-powered pre-IPO basket preview. The MVP implements transparent basket configuration, fungible basket shares, deterministic custody, and a Jupiter CPI path verified on a local validator.**

---

## 2. Short Project Description

**Stocklana Baskets is a Solana protocol for creating weighted on-chain index baskets of tokenized assets. Each basket has transparent constituent weights, deterministic custody vaults, a fungible basket-share mint, deposit and redemption flows, and on-chain allocation logic. The live demo includes a verified local Anchor replay, a real `depositAndMint` transaction on Solana Devnet, and read-only PreStocks and Pyth pricing snapshots. Our featured use case is the AI + Markets Index, a read-only PreStocks-powered pre-IPO basket preview of OpenAI, Anthropic, Figure AI and Kalshi. The current MVP intentionally keeps accounting simple while proving the core index-basket architecture.**

---

## 3. Problem / What problem are you solving?

**Tokenized assets on Solana can be traded individually, but building and managing diversified portfolios still requires users or applications to coordinate multiple assets, weights, custody accounts, and execution steps themselves. Pre-IPO tokens make this sharper: each PreStocks token is a single-company bet, often at a high unit price, so diversified private-market exposure means buying and tracking several positions by hand. Stocklana Baskets turns that complexity into a single programmable on-chain basket primitive, where composition, target weights, custody, share issuance, and execution logic are transparent and deterministic.**

---

## 4. Solution / How does it work?

**A creator defines a basket with 1–10 tokenized assets and target weights totaling 100%. Stocklana creates deterministic on-chain state, a basket-share mint, custody vaults, and per-constituent vaults. Users can deposit the input asset to mint basket shares, redeem shares, and preview weighted allocations on-chain. The program also contains a Jupiter CPI path signed by the basket PDA, verified on a local validator up to external DEX programs.**

---

## 5. Why is this unique / What makes Stocklana different?

**Stocklana is not just a portfolio UI or an off-chain index tracker. The basket itself is an on-chain primitive: its identity, constituent weights, custody structure, share mint, allocation logic, and execution authority are encoded in the protocol. This makes baskets transparent, programmable, and composable for wallets, applications, and future tokenized-asset products on Solana.**

---

## 6. Technical implementation / What did you build?

**The MVP is implemented as an Anchor program on Solana with deterministic PDAs for basket state, basket-share minting, stablecoin custody, and constituent vaults. It includes weighted allocation math, deposit/mint and redeem/withdraw flows, constituent-vault initialization, Jupiter CPI integration with signer handling through `invoke_signed` (verified on a local validator), support for Jupiter V1/V2 route discriminators, and post-swap balance checks. The project includes Rust and TypeScript tests, a reproducible jury replay, a deployed Solana Devnet `depositAndMint` flow, and isolated read-only pricing prototypes using PreStocks API data (the AI + Markets Index) and Pyth Hermes feeds.**

---

## 7. Jupiter integration / Why Jupiter?

**Jupiter lets Stocklana target Solana liquidity without hard-coding a specific DEX. Stocklana wraps Jupiter routes inside the basket program, validates the expected source and destination accounts, preserves Jupiter account ordering, and signs internally with the basket PDA through `invoke_signed`. In local testing, the real execution path from Stocklana into Jupiter and onward into external DEX programs was reached successfully, while full cloned-localnet DEX settlement is intentionally not claimed as production-complete. Jupiter CPI has not yet been executed on a public cluster.**

---

## 8. Current status / What is complete today?

**The simplified MVP core is complete and tested: basket creation, weighted allocation logic, deterministic constituent vaults, basket-share minting, deposit and redemption flows, a locally verified Jupiter CPI path, and post-swap safety checks are implemented. The public demo provides both a reproducible verified Anchor replay and a real wallet-signed `depositAndMint` transaction against the deployed Stocklana program on Solana Devnet. Read-only PreStocks (AI + Markets Index) and Pyth integrations demonstrate asset metadata, prices, and target-quantity calculations without changing the core accounting model. The MVP still uses simplified 1:1 accounting and is not production-ready.**

---

## 9. Roadmap / What comes next?

**The next phase is to turn the current MVP architecture into a production-grade basket protocol. Priorities include portfolio-backed NAV accounting, production oracle adapters building on the verified Pyth prototype, portfolio-backed redemption, automated rebalancing, stronger slippage and MEV protections, governance and emergency controls, adversarial testing and audits, and validated execution on a public Solana cluster. The AI + Markets Index, today a read-only PreStocks-powered pre-IPO basket preview, is the concrete first use case on this path toward portfolio-backed private-market basket products.**

---

## 10. Target users / Who is this for?

**Stocklana is designed for users and applications that want simple exposure to multiple tokenized assets through a single programmable basket. Potential users include investors seeking diversified on-chain portfolios (for example, the diversified pre-IPO exposure modeled by the AI + Markets Index preview, instead of holding four separate PreStocks tokens), wallets and fintech applications that want to offer index-style products, and protocols that need a composable basket primitive instead of managing individual assets and execution logic themselves.**

---

## 11. Submission Summary / Elevator Pitch

**Stocklana Baskets turns diversified tokenized-asset portfolios into a transparent, programmable on-chain primitive on Solana. The MVP demonstrates weighted basket creation, deterministic custody, fungible basket shares, deposit and redemption flows, on-chain allocation logic, and a Jupiter CPI path verified on a local validator. A real wallet-signed Devnet transaction proves the deployed deposit path, while the AI + Markets Index, a read-only PreStocks-powered pre-IPO basket preview, and a Pyth pricing prototype show how the architecture extends to private-market assets and oracle-priced multi-asset baskets. The current 1:1 accounting model is deliberately limited; production NAV accounting, portfolio-backed settlement, rebalancing, and audits are the next phase.**
