const API_URL = "https://prestocks.com/api/prestocks";

const basket = [
  { symbol: "OPENAI", weight: 0.35 },
  { symbol: "ANTHROPIC", weight: 0.30 },
  { symbol: "FIGUREAI", weight: 0.20 },
  { symbol: "KALSHI", weight: 0.15 },
];

const REFERENCE_NOTIONAL_USD = 100;

function extractItems(data) {
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (Array.isArray(value)) return value;
    }
  }

  throw new Error("Unexpected PreStocks API response shape.");
}

function money(value) {
  return `${Number(value).toFixed(2)}`;
}

async function main() {
  const totalWeight = basket.reduce((sum, asset) => sum + asset.weight, 0);

  if (Math.abs(totalWeight - 1) > 1e-9) {
    throw new Error(`Basket weights must total 100%, got ${totalWeight * 100}%`);
  }

  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`PreStocks API request failed: ${response.status}`);
  }

  const items = extractItems(await response.json());
  const bySymbol = new Map(items.map((item) => [item.symbol, item]));

  console.log("==========================================================");
  console.log("STOCKLANA — PRESTOCKS PRE-IPO BASKET PREVIEW");
  console.log("==========================================================");
  console.log(`Reference notional: $${REFERENCE_NOTIONAL_USD.toFixed(2)}`);
  console.log("");
  console.log(
    "Asset       Weight   Token Price   Mark Price    Target Value   Target Units"
  );
  console.log(
    "--------------------------------------------------------------------------"
  );

  for (const asset of basket) {
    const item = bySymbol.get(asset.symbol);

    if (!item) {
      throw new Error(`Missing PreStocks API entry for ${asset.symbol}`);
    }

    const tokenPrice = Number(item.tokenPrice);
    const markPrice = Number(item.markPrice);
    const targetValue = REFERENCE_NOTIONAL_USD * asset.weight;
    const targetUnits = targetValue / tokenPrice;

    if (!Number.isFinite(tokenPrice) || tokenPrice <= 0) {
      throw new Error(`Invalid tokenPrice for ${asset.symbol}`);
    }

    console.log(
      `${asset.symbol.padEnd(11)} ` +
      `${String(Math.round(asset.weight * 100)).padStart(3)}%     ` +
      `${money(tokenPrice).padStart(11)}   ` +
      `${money(markPrice).padStart(10)}   ` +
      `${money(targetValue).padStart(11)}   ` +
      `${targetUnits.toFixed(6)}`
    );
  }

  console.log(
    "--------------------------------------------------------------------------"
  );
  console.log("Total weight: 100%");
  console.log(`Total target allocation: $${REFERENCE_NOTIONAL_USD.toFixed(2)}`);
  console.log("");
  console.log("PreStocks Solana mints:");

  for (const asset of basket) {
    const item = bySymbol.get(asset.symbol);
    console.log(`${asset.symbol.padEnd(11)} ${item.contract_address}`);
  }

  console.log("");
  console.log("Data source: PreStocks API");
  console.log("Target-unit pricing basis: tokenPrice");
  console.log("markPrice: displayed separately for reference");
  console.log("Core accounting: unchanged");
  console.log("Mode: read-only integration prototype");
}

main().catch((error) => {
  console.error("");
  console.error("PRESTOCKS BASKET PREVIEW: FAIL");
  console.error(error);
  process.exit(1);
});
