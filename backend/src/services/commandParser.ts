import type { ParsedIntent } from "../schemas/api.js";

const KNOWN = new Set([
  "SOL",
  "USDC",
  "JUP",
  "BONK",
  "WIF",
  "RAY",
  "ETH",
  "BTC",
]);

function normToken(s: string): string | null {
  const u = s.trim().toUpperCase().replace(/^[$]/, "");
  if (!KNOWN.has(u)) return null;
  return u;
}

type ParseResult =
  | (ParsedIntent & { rawUnknownToken?: undefined })
  | {
      intent: "unknown";
      tokenIn: null;
      tokenOut: null;
      amountUsd: null;
      frequency: null;
      confidence: number;
      requiresConfirmation: boolean;
      summary: string;
      rawUnknownToken?: string;
      swapAmountToken?: null;
      swapFromSymbol?: null;
    };

const NAV_TARGETS: Record<
  string,
  { target: string; route: string; summary: string }
> = {
  dashboard: {
    target: "dashboard",
    route: "/dashboard",
    summary: "Opening dashboard",
  },
  home: {
    target: "dashboard",
    route: "/dashboard",
    summary: "Opening dashboard",
  },
  portfolio: {
    target: "portfolio",
    route: "/portfolio",
    summary: "Opening portfolio",
  },
  dca: {
    target: "dca",
    route: "/dca",
    summary: "Opening auto-invest",
  },
  "auto-invest": {
    target: "dca",
    route: "/dca",
    summary: "Opening auto-invest",
  },
  "auto invest": {
    target: "dca",
    route: "/dca",
    summary: "Opening auto-invest",
  },
  "recurring investments": {
    target: "dca",
    route: "/dca",
    summary: "Opening recurring investments",
  },
  settings: {
    target: "settings",
    route: "/settings",
    summary: "Opening settings",
  },
  "safety settings": {
    target: "settings",
    route: "/settings",
    summary: "Opening safety settings",
  },
  activity: {
    target: "activity",
    route: "/activity",
    summary: "Opening activity",
  },
  history: {
    target: "activity",
    route: "/activity",
    summary: "Opening activity history",
  },
  logs: {
    target: "activity",
    route: "/activity",
    summary: "Opening activity logs",
  },
  trade: {
    target: "trade",
    route: "/dashboard",
    summary: "Opening trade flow",
  },
  swap: {
    target: "trade",
    route: "/dashboard",
    summary: "Opening swap flow",
  },
  buy: {
    target: "trade",
    route: "/dashboard",
    summary: "Opening buy flow",
  },
};

function navigationIntent(targetKey: string): ParsedIntent | null {
  const normalized = targetKey
    .replace(/\b(my|the)\b/g, "")
    .replace(/\b(page|screen|rules|rule|panel)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const route = NAV_TARGETS[normalized] ?? NAV_TARGETS[targetKey];
  if (!route) return null;
  return {
    intent: "navigate",
    tokenIn: null,
    tokenOut: null,
    amountUsd: null,
    frequency: null,
    confidence: 0.96,
    requiresConfirmation: false,
    summary: route.summary,
    target: route.target,
    route: route.route,
    uiAction: null,
    prefill: null,
  };
}

/** Deterministic NLP-style parsing for MVP */
export function parseCommand(text: string): ParseResult {
  const t = text.trim().replace(/\s+/g, " ");

  let m: RegExpExecArray | null;

  const lower = t.toLowerCase();

  m =
    /^(?:open|go\s+to|show|take\s+me\s+to)\s+(?:my\s+)?(.+?)\s*$/i.exec(t);
  if (m) {
    const target = m[1].toLowerCase().replace(/^the\s+/, "").trim();
    const nav = navigationIntent(target);
    if (nav) return nav;
  }

  m =
    /^(?:start|open)\s+(?:a\s+)?(?:buy|trade)\s+(?:order\s+)?(?:for\s+)?([A-Za-z$]+)\s*$/i.exec(
      t
    ) ??
    /^start\s+buying\s+([A-Za-z$]+)\s*$/i.exec(t);
  if (m) {
    const token = normToken(m[1]);
    if (!token) {
      return {
        intent: "unknown",
        tokenIn: null,
        tokenOut: null,
        amountUsd: null,
        frequency: null,
        confidence: 0,
        requiresConfirmation: true,
        summary: "Could not open a trade ticket for an unknown token",
        rawUnknownToken: m[1].toUpperCase(),
      };
    }
    return {
      intent: "navigate",
      tokenIn: "USDC",
      tokenOut: token,
      amountUsd: null,
      frequency: null,
      confidence: 0.9,
      requiresConfirmation: false,
      summary: `Opening buy panel for ${token}`,
      target: "trade",
      route: "/dashboard",
      uiAction: "prefill_buy_command",
      prefill: { tokenOut: token, commandText: `Buy $5 of ${token}` },
    };
  }

  if (/^show\s+(my\s+)?portfolio\b/.test(lower) || /^portfolio\b/.test(lower)) {
    return {
      intent: "portfolio",
      tokenIn: null,
      tokenOut: null,
      amountUsd: null,
      frequency: null,
      confidence: 1,
      requiresConfirmation: false,
      summary: "Show portfolio",
    };
  }

  m =
    /^set\s+my\s+max\s+trade\s+(?:limit\s+)?to\s*\$?\s*([\d.]+)\s*usd?$/i.exec(
      t
    ) ??
    /^set\s+max\s+trade\s+(?:limit\s+)?to\s*\$?\s*([\d.]+)\s*usd?$/i.exec(t);
  if (m) {
    const amount = Number(m[1]);
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        intent: "unknown",
        tokenIn: null,
        tokenOut: null,
        amountUsd: null,
        frequency: null,
        confidence: 0,
        requiresConfirmation: true,
        summary: "Could not parse max trade limit amount",
      };
    }
    return {
      intent: "settings_max_trade",
      tokenIn: null,
      tokenOut: null,
      amountUsd: amount,
      frequency: null,
      confidence: 1,
      requiresConfirmation: false,
      summary: `Set max trade limit to $${amount}`,
    };
  }

  m =
    /^invest\s+\$?\s*([\d.]+)\s*(?:usd\s*)?every\s+(daily|weekly|monthly|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+into\s+([A-Za-z$]+)\s*$/i.exec(
      t
    );
  if (m) {
    const amount = Number(m[1]);
    const freqRaw = m[2].toLowerCase();
    const token = normToken(m[3]);
    const freqMap: Record<string, string> = {
      daily: "daily",
      weekly: "weekly",
      monthly: "monthly",
      monday: "weekly",
      tuesday: "weekly",
      wednesday: "weekly",
      thursday: "weekly",
      friday: "weekly",
      saturday: "weekly",
      sunday: "weekly",
    };
    const frequency = freqMap[freqRaw] ?? "weekly";
    if (!Number.isFinite(amount) || amount <= 0 || !token) {
      return {
        intent: "unknown",
        tokenIn: null,
        tokenOut: null,
        amountUsd: null,
        frequency: null,
        confidence: 0,
        requiresConfirmation: true,
        summary: !token ? `Unknown token in DCA rule` : "Could not parse invest rule",
        rawUnknownToken: !token ? m[3].toUpperCase() : undefined,
      };
    }
    const freqLabel =
      frequency === "daily"
        ? "every day"
        : frequency === "monthly"
          ? "every month"
          : /^fri(day)?$/i.test(freqRaw)
            ? "every Friday"
            : "every week";
    return {
      intent: "dca_setup",
      tokenIn: "USDC",
      tokenOut: token,
      amountUsd: amount,
      frequency,
      confidence: 0.95,
      requiresConfirmation: true,
      summary: `Invest $${amount} ${freqLabel} into ${token}`,
    };
  }

  m =
    /^invest\s+\$?\s*([\d.]+)\s*(?:usd\s*)?every\s+(\w+)\s+into\s+([A-Za-z$]+)\s*$/i.exec(
      t
    );
  if (m) {
    const amount = Number(m[1]);
    const dayOrFreq = m[2].toLowerCase();
    const token = normToken(m[3]);
    let frequency = "weekly";
    if (["daily", "weekly", "monthly"].includes(dayOrFreq)) frequency = dayOrFreq;
    else if (
      [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ].includes(dayOrFreq)
    )
      frequency = "weekly";
    if (!Number.isFinite(amount) || amount <= 0 || !token) {
      return {
        intent: "unknown",
        tokenIn: null,
        tokenOut: null,
        amountUsd: null,
        frequency: null,
        confidence: 0,
        requiresConfirmation: true,
        summary: !token ? `Unknown token` : "Could not parse invest rule",
        rawUnknownToken: !token ? m[3].toUpperCase() : undefined,
      };
    }
    return {
      intent: "dca_setup",
      tokenIn: "USDC",
      tokenOut: token,
      amountUsd: amount,
      frequency,
      confidence: 0.9,
      requiresConfirmation: true,
      summary: `Invest $${amount} every ${dayOrFreq} into ${token}`,
    };
  }

  m =
    /^buy\s+\$?\s*([\d.]+)\s*(?:usd\s*)?(?:of|worth)?\s*([A-Za-z$]+)\s*$/i.exec(
      t
    );
  if (m) {
    const amount = Number(m[1]);
    const token = normToken(m[2]);
    if (!Number.isFinite(amount) || amount <= 0 || !token) {
      return {
        intent: "unknown",
        tokenIn: null,
        tokenOut: null,
        amountUsd: null,
        frequency: null,
        confidence: 0,
        requiresConfirmation: true,
        summary: !token ? `Unknown token` : "Could not parse buy amount",
        rawUnknownToken: !token ? m[2].toUpperCase() : undefined,
      };
    }
    return {
      intent: "buy",
      tokenIn: "USDC",
      tokenOut: token,
      amountUsd: amount,
      frequency: null,
      confidence: 0.98,
      requiresConfirmation: true,
      summary: `Buy $${amount} of ${token}`,
    };
  }

  m =
    /^buy\s+([A-Za-z$]+)\s+for\s+\$?\s*([\d.]+)\s*$/i.exec(t) ??
    /^buy\s+([A-Za-z$]+)\s+with\s+\$?\s*([\d.]+)\s*$/i.exec(t);
  if (m) {
    const token = normToken(m[1]);
    const amount = Number(m[2]);
    if (!token || !Number.isFinite(amount) || amount <= 0) {
      return {
        intent: "unknown",
        tokenIn: null,
        tokenOut: null,
        amountUsd: null,
        frequency: null,
        confidence: 0,
        requiresConfirmation: true,
        summary: "Could not parse buy command",
        rawUnknownToken: !token ? m[1].toUpperCase() : undefined,
      };
    }
    return {
      intent: "buy",
      tokenIn: "USDC",
      tokenOut: token,
      amountUsd: amount,
      frequency: null,
      confidence: 0.92,
      requiresConfirmation: true,
      summary: `Buy $${amount} of ${token}`,
    };
  }

  m =
    /^swap\s+([\d.]+)\s+([A-Za-z$]+)\s+to\s+([A-Za-z$]+)\s*$/i.exec(t) ??
    /^swap\s+([\d.]+)\s+([A-Za-z$]+)\s+into\s+([A-Za-z$]+)\s*$/i.exec(t);
  if (m) {
    const amt = Number(m[1]);
    const a = normToken(m[2]);
    const b = normToken(m[3]);
    if (!Number.isFinite(amt) || amt <= 0 || !a || !b) {
      return {
        intent: "unknown",
        tokenIn: null,
        tokenOut: null,
        amountUsd: null,
        frequency: null,
        confidence: 0,
        requiresConfirmation: true,
        summary: "Could not parse swap",
        rawUnknownToken: !a ? m[2].toUpperCase() : !b ? m[3].toUpperCase() : undefined,
      };
    }
    return {
      intent: "swap",
      tokenIn: a,
      tokenOut: b,
      amountUsd: null,
      frequency: null,
      confidence: 0.96,
      requiresConfirmation: true,
      summary: `Swap ${amt} ${a} to ${b}`,
      swapAmountToken: amt,
      swapFromSymbol: a,
    };
  }

  return {
    intent: "unknown",
    tokenIn: null,
    tokenOut: null,
    amountUsd: null,
    frequency: null,
    confidence: 0,
    requiresConfirmation: true,
    summary: "Command not recognized. Try: Buy $5 of SOL, Swap 10 USDC to JUP, or Show my portfolio.",
  };
}

export function isKnownToken(symbol: string): boolean {
  return KNOWN.has(symbol.toUpperCase());
}
