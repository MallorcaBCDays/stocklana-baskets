export const VERIFIED_LOCAL_PROOF = {
  network: "Local validator",
  status: "DEMO COMPLETE",
  programId: "5p7G79qSFHWFKiqK2LjeMLFWpPPATNxBroZnv8Do3QZB",

  basketPda: "3LCGwPk9yWMYmfH6qw8wxSZWb1uUrKLrr7UpdHjPRwYR",
  basketShareMint: "GK3DqnMQvCUNHNsh6oGcyJkFM4iHCJoEDuSLnudEKCEc",
  stablecoinVault: "CqRKfMc4dEqtJP77jrGkGi87y1t8BW4jaw59yU8FcXFt",
  constituentVault: "GqDVUGLWmCZogv3acPvQUmfykPwJahknLp17pXveRgFF",

  flow: {
    initialVaultUsdc: 0,
    initialShares: 0,

    depositUsdc: 5,
    vaultAfterDepositUsdc: 5,
    sharesAfterDeposit: 5,

    redeemedShares: 2,
    vaultAfterRedeemUsdc: 3,
    sharesAfterRedeem: 3,
    returnedUsdc: 2,
  },

  notes: [
    "Basket created.",
    "Weights stored.",
    "Constituent vault created and controlled by the Basket PDA.",
    "Deposit and basket-share mint demonstrated.",
    "Redeem and basket-share burn demonstrated.",
    "Weighted allocation preview verified.",
  ],
} as const;
