import { Router } from "express";
import { simulateTradeBodySchema } from "../schemas/api.js";
import { sendZod } from "../middleware/errors.js";
import { simulateTradeResult } from "../services/simulateTrade.js";

export const simulateRouter = Router();

simulateRouter.post("/simulate-trade", (req, res) => {
  const parsed = simulateTradeBodySchema.safeParse(req.body);
  if (!parsed.success) return sendZod(res, parsed.error);

  const { parsedIntent } = parsed.data;
  if (!["buy", "swap"].includes(parsedIntent.intent)) {
    return res.status(400).json({
      error: "Simulation only supported for buy and swap intents after confirmation.",
    });
  }

  const result = simulateTradeResult(parsedIntent);
  res.json(result);
});
