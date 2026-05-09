import { Router } from "express";
import { parseCommand } from "../services/commandParser.js";
import {
  parsedIntentSchema,
  parseCommandBodySchema,
  type ParsedIntent,
} from "../schemas/api.js";
import { sendZod } from "../middleware/errors.js";

export const parseCommandRouter = Router();

parseCommandRouter.post("/parse-command", (req, res) => {
  const body = parseCommandBodySchema.safeParse(req.body);
  if (!body.success) return sendZod(res, body.error);

  const raw = parseCommand(body.data.text);
  const intent: ParsedIntent = {
    intent: raw.intent,
    tokenIn: raw.tokenIn,
    tokenOut: raw.tokenOut,
    amountUsd: raw.amountUsd,
    frequency: raw.frequency,
    confidence: raw.confidence,
    requiresConfirmation: raw.requiresConfirmation,
    summary: raw.summary,
    swapAmountToken:
      "swapAmountToken" in raw ? raw.swapAmountToken ?? null : null,
    swapFromSymbol:
      "swapFromSymbol" in raw ? raw.swapFromSymbol ?? null : null,
    target: "target" in raw ? raw.target ?? null : null,
    route: "route" in raw ? raw.route ?? null : null,
    uiAction: "uiAction" in raw ? raw.uiAction ?? null : null,
    prefill: "prefill" in raw ? raw.prefill ?? null : null,
  };

  const valid = parsedIntentSchema.safeParse(intent);
  if (!valid.success) return sendZod(res, valid.error);
  res.json(valid.data);
});
