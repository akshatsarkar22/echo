import type { ParsedIntent } from "../schemas/api.js";

const ROUGH_PRICES: Record<string, number> = {
  SOL: 145,
  USDC: 1,
  JUP: 2,
  BONK: 0.00002,
  WIF: 2.4,
  RAY: 3,
};

export function simulateTradeResult(
  parsedIntent: ParsedIntent
): {
  simulated: true;
  status: "success" | "skipped";
  estimatedOutput?: string;
  networkFeeUsd: number;
  slippagePercent: number;
  receiptId: string;
  routeLabel: string;
  quoteExpiresAt: string;
  auditTrail: string[];
  summary: string;
} {
  const now = new Date();
  const quoteExpiresAt = new Date(now.getTime() + 90_000).toISOString();
  const receiptId = `sim_${now.getTime().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  if (parsedIntent.intent === "buy" && parsedIntent.tokenOut && parsedIntent.amountUsd) {
    const price = ROUGH_PRICES[parsedIntent.tokenOut.toUpperCase()] ?? 50;
    const out = parsedIntent.amountUsd / price;
    return {
      simulated: true as const,
      status: "success",
      estimatedOutput: `${out.toFixed(6)} ${parsedIntent.tokenOut}`,
      networkFeeUsd: 0.001,
      slippagePercent: 0.5,
      receiptId,
      routeLabel: `USDC -> ${parsedIntent.tokenOut}`,
      quoteExpiresAt,
      auditTrail: [
        "Parsed natural-language buy intent",
        "Applied wallet guardrails",
        "Generated illustrative quote",
        "Recorded simulation receipt",
      ],
      summary: `Simulated buy — $${parsedIntent.amountUsd} ${parsedIntent.tokenOut} purchase (quotes are illustrative, not Jupiter).`,
    };
  }
  if (parsedIntent.intent === "swap" && parsedIntent.tokenIn && parsedIntent.tokenOut) {
    const amt = parsedIntent.swapAmountToken ?? 1;
    return {
      simulated: true as const,
      status: "success",
      estimatedOutput: `~ ${(amt * 0.997).toFixed(4)} ${parsedIntent.tokenOut} (estimated)`,
      networkFeeUsd: 0.001,
      slippagePercent: 0.65,
      receiptId,
      routeLabel: `${parsedIntent.tokenIn} -> ${parsedIntent.tokenOut}`,
      quoteExpiresAt,
      auditTrail: [
        "Parsed natural-language swap intent",
        "Applied wallet guardrails",
        "Estimated simulated route",
        "Recorded simulation receipt",
      ],
      summary: `Simulated swap of ${amt} ${parsedIntent.tokenIn} → ${parsedIntent.tokenOut}`,
    };
  }

  return {
    simulated: true as const,
    status: "skipped",
    estimatedOutput: undefined,
    networkFeeUsd: 0,
    slippagePercent: 0,
    receiptId,
    routeLabel: "No route",
    quoteExpiresAt,
    auditTrail: ["No executable simulated route was available"],
    summary: "Nothing simulated for this intent.",
  };
}
