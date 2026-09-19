import { HermesClient } from "@pythnetwork/hermes-client";

const API_KEY = process.env.PYTH_API_KEY;

if (!API_KEY) {
  console.error("Missing PYTH_API_KEY.");
  console.error("Set it in the shell before running this test.");
  process.exit(1);
}

const HERMES_URL = "https://pyth.dourolabs.app/hermes";

// BTC/USD — used only to verify that Hermes authentication
// and price retrieval work.
const BTC_USD_PRICE_ID =
  "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

async function main() {
  console.log("STOCKLANA — PYTH CONNECTION TEST");
  console.log("Hermes:", HERMES_URL);

  const hermes = new HermesClient(HERMES_URL, {
    accessToken: API_KEY,
  });

  const update = await hermes.getLatestPriceUpdates(
    [BTC_USD_PRICE_ID],
    { parsed: true }
  );

  if (!update.parsed || update.parsed.length === 0) {
    throw new Error("Hermes returned no parsed BTC/USD price data.");
  }

  const feed = update.parsed[0];

  console.log("Connection: PASS");
  console.log("Feed ID:", feed.id);
  console.log("Raw price:", feed.price.price);
  console.log("Exponent:", feed.price.expo);
  console.log("Publish time:", feed.price.publish_time);
}

main().catch((error) => {
  console.error("Connection: FAIL");
  console.error(error);
  process.exit(1);
});
