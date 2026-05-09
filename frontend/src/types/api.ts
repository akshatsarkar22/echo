export type ParsedIntent = {
  intent: string;
  tokenIn: string | null;
  tokenOut: string | null;
  amountUsd: number | null;
  frequency: string | null;
  confidence: number;
  requiresConfirmation: boolean;
  summary: string;
  swapAmountToken?: number | null;
  swapFromSymbol?: string | null;
  target?: string | null;
  route?: string | null;
  uiAction?: string | null;
  prefill?: Record<string, string> | null;
};

export type SafetyCheck = {
  approved: boolean;
  warnings: string[];
  blockedReasons: string[];
  riskLevel: string;
};

export type ExecutionResult = {
  simulated?: boolean;
  status?: string;
  estimatedOutput?: string;
  networkFeeUsd?: number;
  slippagePercent?: number;
  receiptId?: string;
  routeLabel?: string;
  quoteExpiresAt?: string;
  auditTrail?: string[];
  summary?: string;
};

export type PortfolioResponse = {
  walletAddress: string;
  totalValueUsd: number;
  tokens: {
    symbol: string;
    balance: number;
    priceUsd: number;
    valueUsd: number;
    allocation: number;
  }[];
  summary: string;
  isDemoData: boolean;
  demoNote?: string;
};

export type SimulateTradeResponse = {
  simulated: boolean;
  status: string;
  estimatedOutput?: string;
  networkFeeUsd: number;
  slippagePercent: number;
  receiptId: string;
  routeLabel: string;
  quoteExpiresAt: string;
  auditTrail: string[];
  summary: string;
};

export type UserSettingsDto = {
  walletAddress: string;
  maxTradeUsd: number;
  requireConfirmation: boolean;
  allowedTokens: string[];
  blockedTokens: string[];
  riskLevel: string;
  simulationMode: boolean;
};

export type DcaRuleDto = {
  id: string;
  walletAddress: string;
  tokenSymbol: string;
  amountUsd: number;
  frequency: string;
  active: boolean;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivityItem = {
  id: string;
  walletAddress: string;
  commandText: string;
  parsedIntent: ParsedIntent | Record<string, unknown>;
  safetyResult: SafetyCheck | null;
  executionResult: ExecutionResult | Record<string, unknown> | null;
  status: string;
  summary: string;
  txSignature: string | null;
  simulated: boolean;
  createdAt: string;
};
