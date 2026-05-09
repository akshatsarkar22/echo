import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { settingsPatchSchema } from "../schemas/api.js";
import { sendZod } from "../middleware/errors.js";
import {
  getOrCreateSettings,
  settingsToDto,
  updateTokensJson,
} from "../services/userSettings.js";

export const settingsRouter = Router();

const walletParam = z.string().min(32).max(64);

settingsRouter.get("/settings/:walletAddress", async (req, res, next) => {
  try {
    const w = walletParam.safeParse(req.params.walletAddress);
    if (!w.success) return sendZod(res, w.error);
    const row = await getOrCreateSettings(w.data);
    res.json(settingsToDto(row));
  } catch (e) {
    next(e);
  }
});

settingsRouter.patch("/settings/:walletAddress", async (req, res, next) => {
  try {
    const w = walletParam.safeParse(req.params.walletAddress);
    if (!w.success) return sendZod(res, w.error);
    const parsed = settingsPatchSchema.safeParse(req.body);
    if (!parsed.success) return sendZod(res, parsed.error);

    const current = await getOrCreateSettings(w.data);

    const row = await prisma.userSettings.update({
      where: { walletAddress: w.data },
      data: {
        maxTradeUsd: parsed.data.maxTradeUsd,
        requireConfirmation: parsed.data.requireConfirmation,
        riskLevel: parsed.data.riskLevel,
        simulationMode: parsed.data.simulationMode,
        allowedTokensJson:
          parsed.data.allowedTokens !== undefined
            ? updateTokensJson(
                current.allowedTokensJson,
                parsed.data.allowedTokens
              )
            : undefined,
        blockedTokensJson:
          parsed.data.blockedTokens !== undefined
            ? updateTokensJson(
                current.blockedTokensJson,
                parsed.data.blockedTokens
              )
            : undefined,
      },
    });

    res.json(settingsToDto(row));
  } catch (e) {
    next(e);
  }
});
