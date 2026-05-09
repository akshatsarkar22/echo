import { prisma } from "../lib/prisma.js";

const DEFAULT_ALLOWED = ["SOL", "USDC", "JUP", "BONK"];
const DEFAULT_BLOCKED: string[] = [];

function parseList(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function stringifyList(list: string[]): string {
  return JSON.stringify(list.map((x) => x.toUpperCase()));
}

export async function getOrCreateSettings(walletAddress: string) {
  const existing = await prisma.userSettings.findUnique({
    where: { walletAddress },
  });
  if (existing) return existing;

  return prisma.userSettings.create({
    data: {
      walletAddress,
      maxTradeUsd: 25,
      requireConfirmation: true,
      allowedTokensJson: stringifyList(DEFAULT_ALLOWED),
      blockedTokensJson: stringifyList(DEFAULT_BLOCKED),
      riskLevel: "medium",
      simulationMode: true,
    },
  });
}

export function settingsToDto(row: {
  walletAddress: string;
  maxTradeUsd: number;
  requireConfirmation: boolean;
  allowedTokensJson: string;
  blockedTokensJson: string;
  riskLevel: string;
  simulationMode: boolean;
}) {
  return {
    walletAddress: row.walletAddress,
    maxTradeUsd: row.maxTradeUsd,
    requireConfirmation: row.requireConfirmation,
    allowedTokens: parseList(row.allowedTokensJson),
    blockedTokens: parseList(row.blockedTokensJson),
    riskLevel: row.riskLevel as "low" | "medium" | "high",
    simulationMode: row.simulationMode,
  };
}

export function updateTokensJson(
  current: string,
  incoming: string[] | undefined
) {
  if (incoming === undefined) return current;
  return stringifyList(incoming);
}
