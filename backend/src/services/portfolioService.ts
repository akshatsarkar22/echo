/** Mock portfolio with stable demo quotes — flagged as demo in API response */

const MOCK_PRICES: Record<string, number> = {
  SOL: 145.5,
  USDC: 1,
  JUP: 1.85,
  BONK: 0.000018,
  WIF: 2.42,
  RAY: 3.15,
};

export interface PortfolioTokenRow {
  symbol: string;
  balance: number;
  priceUsd: number;
  valueUsd: number;
  allocation: number;
}

export function mockPortfolio(walletAddress: string): {
  totalValueUsd: number;
  tokens: PortfolioTokenRow[];
  summary: string;
  isDemoData: true;
  demoNote: string;
} {
  void walletAddress;
  const seeded = walletAddress.slice(0, 4);
  const factor = seeded.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const solBal = 2.5 + (factor % 30) / 100;
  const usdcBal = 380 + (factor % 200);
  const jupBal = 120 + (factor % 80);

  const raw = [
    { symbol: "SOL", balance: solBal, price: MOCK_PRICES.SOL ?? 145 },
    { symbol: "USDC", balance: usdcBal, price: MOCK_PRICES.USDC ?? 1 },
    { symbol: "JUP", balance: jupBal, price: MOCK_PRICES.JUP ?? 2 },
  ];

  let totalValueUsd = 0;
  const enriched = raw.map((r) => {
    const valueUsd = r.balance * r.price;
    totalValueUsd += valueUsd;
    return { symbol: r.symbol, balance: r.balance, priceUsd: r.price, valueUsd };
  });

  const tokens: PortfolioTokenRow[] = enriched.map((e) => ({
    symbol: e.symbol,
    balance: Math.round(e.balance * 10000) / 10000,
    priceUsd: e.priceUsd,
    valueUsd: Math.round(e.valueUsd * 100) / 100,
    allocation: totalValueUsd
      ? Math.round((e.valueUsd / totalValueUsd) * 1000) / 10
      : 0,
  }));

  const top = tokens.reduce((a, b) =>
    (a.allocation ?? 0) >= (b.allocation ?? 0) ? a : b
  );
  let riskTone = "moderate";
  if (top.symbol === "SOL" || top.symbol === "JUP") riskTone = "moderate volatility";
  if (top.symbol === "USDC") riskTone = "lower volatility weights";

  const summary = `Holdings tilt toward ${top.symbol}; overall ${riskTone} for a starter stack. Resona uses demo balances — not linked to mainnet.`;

  return {
    totalValueUsd: Math.round(totalValueUsd * 100) / 100,
    tokens,
    summary,
    isDemoData: true as const,
    demoNote: "Quoted balances and USD values are simulated demo data.",
  };
}
