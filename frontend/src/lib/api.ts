import type {
  ActivityItem,
  DcaRuleDto,
  ExecutionResult,
  ParsedIntent,
  PortfolioResponse,
  SafetyCheck,
  SimulateTradeResponse,
  UserSettingsDto,
} from "@/types/api";

function base(): string {
  return import.meta.env.VITE_API_URL ?? "http://localhost:4000";
}

async function json<T>(
  path: string,
  init?: RequestInit & { method?: string }
): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  const ct = res.headers.get("content-type");
  const body =
    ct?.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const msg =
      typeof body === "object" && body && "error" in body
        ? String((body as { error?: string }).error ?? res.statusText)
        : typeof body === "string"
          ? body
          : res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return body as T;
}

export const api = {
  parseCommand: (body: { text: string; walletAddress?: string }) =>
    json<ParsedIntent>("/api/parse-command", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  safetyCheck: (body: { walletAddress: string; parsedIntent: ParsedIntent }) =>
    json<SafetyCheck>("/api/safety-check", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  portfolio: (walletAddress: string) =>
    json<PortfolioResponse>(`/api/portfolio/${encodeURIComponent(walletAddress)}`),
  simulateTrade: (body: {
    walletAddress: string;
    parsedIntent: ParsedIntent;
    confirmedByUser: true;
  }) =>
    json<SimulateTradeResponse>("/api/simulate-trade", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  dcaList: (walletAddress: string) =>
    json<DcaRuleDto[]>(
      `/api/dca/${encodeURIComponent(walletAddress)}`
    ),
  dcaCreate: (body: {
    walletAddress: string;
    tokenSymbol: string;
    amountUsd: number;
    frequency: "daily" | "weekly" | "monthly";
    active?: boolean;
  }) =>
    json<DcaRuleDto>("/api/dca", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  dcaPatch: (
    id: string,
    body: Partial<{
      tokenSymbol: string;
      amountUsd: number;
      frequency: "daily" | "weekly" | "monthly";
      active: boolean;
    }>
  ) =>
    json<DcaRuleDto>(`/api/dca/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  dcaDelete: (id: string) =>
    fetch(`${base()}/api/dca/${encodeURIComponent(id)}`, { method: "DELETE" }).then(
      (r) => {
        if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`);
      }
    ),
  settingsGet: (walletAddress: string) =>
    json<UserSettingsDto>(
      `/api/settings/${encodeURIComponent(walletAddress)}`
    ),
  settingsPatch: (
    walletAddress: string,
    body: Partial<{
      maxTradeUsd: number;
      requireConfirmation: boolean;
      allowedTokens: string[];
      blockedTokens: string[];
      riskLevel: string;
      simulationMode: boolean;
    }>
  ) =>
    json<UserSettingsDto>(
      `/api/settings/${encodeURIComponent(walletAddress)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      }
    ),
  activityList: (walletAddress: string) =>
    json<ActivityItem[]>(
      `/api/activity/${encodeURIComponent(walletAddress)}`
    ),
  activityPost: (body: {
    walletAddress: string;
    commandText: string;
    parsedIntent: ParsedIntent;
    safetyResult?: SafetyCheck | null;
    executionResult?: ExecutionResult | null;
    status: string;
    summary: string;
    simulated: boolean;
    txSignature?: string | null;
  }) =>
    json<ActivityItem>("/api/activity", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
