import { PublicKey } from "@solana/web3.js";

export const STOCKLANA_PROGRAM_ID = new PublicKey(
  "5p7G79qSFHWFKiqK2LjeMLFWpPPATNxBroZnv8Do3QZB"
);

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function u64le(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, value, true);
  return bytes;
}

export function deriveBasketPda(
  creator: PublicKey,
  basketId: bigint
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      utf8("basket"),
      creator.toBytes(),
      u64le(basketId),
    ],
    STOCKLANA_PROGRAM_ID
  );
}

export function deriveBasketMintPda(
  basket: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      utf8("basket_mint"),
      basket.toBytes(),
    ],
    STOCKLANA_PROGRAM_ID
  );
}

export function deriveStablecoinVaultPda(
  basket: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      utf8("stablecoin_vault"),
      basket.toBytes(),
    ],
    STOCKLANA_PROGRAM_ID
  );
}

export function deriveConstituentVaultPda(
  basket: PublicKey,
  index: number
): [PublicKey, number] {
  if (!Number.isInteger(index) || index < 0 || index > 255) {
    throw new Error("Constituent index must be an integer between 0 and 255.");
  }

  return PublicKey.findProgramAddressSync(
    [
      utf8("constituent_vault"),
      basket.toBytes(),
      Uint8Array.of(index),
    ],
    STOCKLANA_PROGRAM_ID
  );
}

export function deriveBasketInfrastructure(
  creator: PublicKey,
  basketId: bigint,
  constituentCount: number
) {
  const [basket, basketBump] = deriveBasketPda(creator, basketId);
  const [basketMint, basketMintBump] = deriveBasketMintPda(basket);
  const [stablecoinVault, stablecoinVaultBump] =
    deriveStablecoinVaultPda(basket);

  const constituentVaults = Array.from(
    { length: constituentCount },
    (_, index) => {
      const [address, bump] = deriveConstituentVaultPda(basket, index);

      return {
        index,
        address,
        bump,
      };
    }
  );

  return {
    basket,
    basketBump,
    basketMint,
    basketMintBump,
    stablecoinVault,
    stablecoinVaultBump,
    constituentVaults,
  };
}
