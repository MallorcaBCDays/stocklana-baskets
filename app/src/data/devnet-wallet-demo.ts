import { PublicKey } from "@solana/web3.js";

export const DEVNET_WALLET_DEMO = {
  programId: new PublicKey(
    "5p7G79qSFHWFKiqK2LjeMLFWpPPATNxBroZnv8Do3QZB"
  ),

  basket: new PublicKey(
    "2DiKcr2mudaw9KpJ1PzJGzS3XbCCfMvUsSKMteAWmN5N"
  ),

  basketMint: new PublicKey(
    "4Du31zrcLU5nQMDjouBUApDYyjHBH2eazU2aC4GqTTYC"
  ),

  stablecoinVault: new PublicKey(
    "CBdEneZiAj4jbKQPBpc9K2Aj6yzpQXPaoRVCzH9oiRUu"
  ),

  stablecoinMint: new PublicKey(
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  ),

  constituents: [
    new PublicKey("Dns7ctiH1dtcSwPmAvCbLhSMjPQLoSctgabHeE9dJtDr"),
    new PublicKey("63B67jYiAA1KR3YpfN3tmoEuk6E3eVyLZ3GtSYdNU8aa"),
    new PublicKey("4Mmdf5jiMAeeUXw1TzosH2GyhFPb8qiw5QEF4dTddkZq"),
    new PublicKey("C7a7QTVi4TYbNaoHmn6yJRcB6eHS12q6Tcdj7JPp1e1U"),
  ],

  weightsBps: [4000, 2500, 2000, 1500],
} as const;
