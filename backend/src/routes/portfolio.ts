import { Router } from "express";
import { z } from "zod";
import { mockPortfolio } from "../services/portfolioService.js";
import { sendZod } from "../middleware/errors.js";

export const portfolioRouter = Router();

const walletParam = z.string().min(32).max(64);

portfolioRouter.get("/portfolio/:walletAddress", (req, res) => {
  const w = walletParam.safeParse(req.params.walletAddress);
  if (!w.success) return sendZod(res, w.error);

  const p = mockPortfolio(w.data);
  res.json({
    walletAddress: w.data,
    totalValueUsd: p.totalValueUsd,
    tokens: p.tokens,
    summary: p.summary,
    isDemoData: true,
    demoNote: p.demoNote,
  });
});
