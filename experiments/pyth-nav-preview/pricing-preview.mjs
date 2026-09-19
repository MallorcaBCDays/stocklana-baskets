import { HermesClient } from "@pythnetwork/hermes-client";

const API_KEY = process.env.PYTH_API_KEY;

if (!API_KEY) {
  console.error("Missing PYTH_API_KEY.");
  process.exit(1);
}

const HERMES_URL = "https://pyth.dourolabs.app/hermes";
const SYMBOLS_URL = "https://pyth.dourolabs.app/v1/symbols";

const basket = [
  {
    ticker: "TSLA",
    weight: 0.35,
    query: "TSLA",
    assetType: "equity",
    symbol: "Equity.US.TSLA/USD",
  },
  {
    ticker: "QQQ",
    weight: 0.30,
    query: "QQQ",
    assetType: "equity",
    symbol: "Equity.US.QQQ/USD",
  },
  {
    ticker: "VOO",
    weight: 0.25,
    query: "VOO",
    assetType: "equity",
    symbol: "Equity.US.VOO/USD",
  },
  {
    ticker: "XAU",
    weight: 0.10,
    query: "XAU",
    assetType: "metal",
    symbol: "Metal.XAU/USD",
  },
];

const REFERENCE_NOTIONAL_USD = 100;

async function findFeed(asset) {
  const url =
    `${SYMBOLS_URL}?query=${encodeURIComponent(asset.query)}` +
    `&asset_type=${encodeURIComponent(asset.assetType)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Feed discovery failed for ${asset.ticker}: ${response.status}`
    );
  }

  const feeds = await response.json();

  const feed = feeds.find(
    (item) =>
      item.symbol === asset.symbol &&
      item.state === "stable" &&
      item.hermes_id
  );

  if (!feed) {
    throw new Error(
      `No stable Pyth feed found for ${asset.ticker} (${asset.symbol})`
    );
  }

  return {
    ...asset,
    id: feed.hermes_id.startsWith("0x")
      ? feed.hermes_id
      : `0x${feed.hermes_id}`,
  };
}

function decimalPrice(priceObject) {
  return (
    Number(priceObject.price) *
    Math.pow(10, Number(priceObject.expo))
  );
}

async function main() {
  console.log("======================================================");
  console.log("STOCKLANA — PYTH MULTI-ASSET PRICING PREVIEW");
  console.log("======================================================");
  console.log(`Reference notional: $${REFERENCE_NOTIONAL_USD.toFixed(2)}`);
  console.log("");

  const discoveredFeeds = [];

  for (const asset of basket) {
    discoveredFeeds.push(await findFeed(asset));
  }

  const hermes = new HermesClient(HERMES_URL, {
    accessToken: API_KEY,
  });

  const priceIds = discoveredFeeds.map((feed) => feed.id);

  const update = await hermes.getLatestPriceUpdates(priceIds, {
    parsed: true,
  });

  if (!update.parsed || update.parsed.length !== basket.length) {
    throw new Error("Did not receive all expected Pyth prices.");
  }

  const priceById = new Map(
    update.parsed.map((feed) => [
      feed.id.toLowerCase().replace(/^0x/, ""),
      feed,
    ])
  );

  let totalWeight = 0;
  let totalTargetValue = 0;

  console.log(
    "Asset   Weight   Pyth Price     Target Value   Target Units"
  );
  console.log(
    "------------------------------------------------------------"
  );

  for (const asset of discoveredFeeds) {
    const lookupId = asset.id.toLowerCase().replace(/^0x/, "");
    const feed = priceById.get(lookupId);

    if (!feed) {
      throw new Error(`Missing returned price for ${asset.ticker}`);
    }

    const price = decimalPrice(feed.price);
    const targetValue = REFERENCE_NOTIONAL_USD * asset.weight;
    const targetUnits = targetValue / price;

    totalWeight += asset.weight;
    totalTargetValue += targetValue;

    console.log(
      `${asset.ticker.padEnd(7)} ` +
      `${(asset.weight * 100).toFixed(0).padStart(3)}%    ` +
      `$${price.toFixed(2).padStart(10)}    ` +
      `$${targetValue.toFixed(2).padStart(10)}    ` +
      `${targetUnits.toFixed(6)}`
    );
  }

  console.log(
    "------------------------------------------------------------"
  );
  console.log(`Total weight: ${(totalWeight * 100).toFixed(0)}%`);
  console.log(`Total target allocation: $${totalTargetValue.toFixed(2)}`);
  console.log("");
  console.log("Pricing source: Pyth");
  console.log("Basket type: Multi-asset");
  console.log("Core accounting: unchanged");
  console.log("Mode: read-only pricing prototype");
}

main().catch((error) => {
  console.error("");
  console.error("PYTH PRICING PREVIEW: FAIL");
  console.error(error);
  process.exit(1);
});
