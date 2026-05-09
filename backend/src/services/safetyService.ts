import type { ParsedIntent } from "../schemas/api.js";
import { prisma } from "../lib/prisma.js";
import { getOrCreateSettings } from "./userSettings.js";
import { isKnownToken } from "./commandParser.js";

export interface SafetyResult {
  approved: boolean;
  warnings: string[];
  blockedReasons: string[];
  riskLevel: string;
}

function parseList(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map((x: string) => String(x).toUpperCase()) : [];
  } catch {
    return [];
  }
}

function tokenAllowed(
  sym: string,
  allowedTokens: string[],
  blockedTokens: string[]
): { ok: boolean; reason?: string } {
  const up = sym.toUpperCase();
  if (!isKnownToken(up))
    return { ok: false, reason: `Token "${up}" is not supported in this MVP.` };
  if (blockedTokens.includes(up))
    return { ok: false, reason: `"${up}" is on your blocked list in Settings.` };
  if (allowedTokens.length && !allowedTokens.includes(up))
    return { ok: false, reason: `"${up}" is not in your allowed token list.` };
  return { ok: true };
}

export async function runSafetyCheck(
  walletAddress: string,
  parsedIntent: ParsedIntent
): Promise<SafetyResult> {
  await getOrCreateSettings(walletAddress);

  const row = await prisma.userSettings.findUnique({
    where: { walletAddress },
  });
  if (!row) throw new Error("Settings missing after create");

  const warnings: string[] = [];
  const blockedReasons: string[] = [];
  const allowedTokens = parseList(row.allowedTokensJson);
  const blockedTokens = parseList(row.blockedTokensJson);
  const riskLevel = row.riskLevel;

  if (!walletAddress?.trim())
    warnings.push("No wallet linked — safety checks are illustrative only.");

  warnings.push(
    "Resona does not provide financial advice — you are responsible for your own decisions."
  );

  if (riskLevel === "high")
    warnings.push("Your risk preference is set to high — consider smaller position sizes.");

  function blockIfBad(sym: string | null) {
    if (!sym) return;
    const r = tokenAllowed(sym, allowedTokens, blockedTokens);
    if (!r.ok && r.reason) blockedReasons.push(r.reason);
  }

  if (parsedIntent.intent === "buy") {
    blockIfBad(parsedIntent.tokenOut);
    const usd = parsedIntent.amountUsd ?? 0;
    if (usd > row.maxTradeUsd)
      blockedReasons.push(
        `Trade exceeds your max trade limit of $${row.maxTradeUsd.toFixed(2)}.`
      );
  }
  if (parsedIntent.intent === "dca_setup") {
    blockIfBad(parsedIntent.tokenOut);
    const usd = parsedIntent.amountUsd ?? 0;
    if (usd > row.maxTradeUsd)
      blockedReasons.push(
        `DCA amount exceeds your max trade setting ($${row.maxTradeUsd.toFixed(2)}).`
      );
  }
  if (parsedIntent.intent === "swap") {
    blockIfBad(parsedIntent.tokenIn);
    blockIfBad(parsedIntent.tokenOut);
    warnings.push(
      "Swaps quote token quantities — fiat caps aren't auto-applied to every route in this MVP."
    );
  }

  if (parsedIntent.intent === "unknown")
    blockedReasons.push("Command could not be understood.");

  return {
    approved: blockedReasons.length === 0,
    warnings,
    blockedReasons,
    riskLevel,
  };
}
