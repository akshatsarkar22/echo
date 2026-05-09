import { Router } from "express";
import { safetyCheckBodySchema } from "../schemas/api.js";
import { sendZod } from "../middleware/errors.js";
import { runSafetyCheck } from "../services/safetyService.js";

export const safetyRouter = Router();

safetyRouter.post("/safety-check", async (req, res, next) => {
  try {
    const parsed = safetyCheckBodySchema.safeParse(req.body);
    if (!parsed.success) return sendZod(res, parsed.error);
    const out = await runSafetyCheck(parsed.data.walletAddress, parsed.data.parsedIntent);
    res.json(out);
  } catch (e) {
    next(e);
  }
});
