import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { activityPostSchema } from "../schemas/api.js";
import { sendZod } from "../middleware/errors.js";
import { getOrCreateSettings } from "../services/userSettings.js";

export const activityRouter = Router();

const walletParam = z.string().min(32).max(64);

activityRouter.get("/activity/:walletAddress", async (req, res, next) => {
  try {
    const w = walletParam.safeParse(req.params.walletAddress);
    if (!w.success) return sendZod(res, w.error);
    await getOrCreateSettings(w.data);
    const items = await prisma.activityLog.findMany({
      where: { walletAddress: w.data },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(
      items.map((item) => ({
        id: item.id,
        walletAddress: item.walletAddress,
        commandText: item.commandText,
        parsedIntent: JSON.parse(item.parsedIntentJson) as unknown,
        safetyResult: item.safetyResultJson
          ? (JSON.parse(item.safetyResultJson) as unknown)
          : null,
        executionResult: item.executionResultJson
          ? (JSON.parse(item.executionResultJson) as unknown)
          : null,
        status: item.status,
        summary: item.summary,
        txSignature: item.txSignature ?? null,
        simulated: item.simulated,
        createdAt: item.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    next(e);
  }
});

activityRouter.post("/activity", async (req, res, next) => {
  try {
    const parsed = activityPostSchema.safeParse(req.body);
    if (!parsed.success) return sendZod(res, parsed.error);

    await getOrCreateSettings(parsed.data.walletAddress);
    const log = await prisma.activityLog.create({
      data: {
        walletAddress: parsed.data.walletAddress,
        commandText: parsed.data.commandText,
        parsedIntentJson: JSON.stringify(parsed.data.parsedIntent),
        safetyResultJson:
          parsed.data.safetyResult === undefined
            ? null
            : JSON.stringify(parsed.data.safetyResult),
        executionResultJson:
          parsed.data.executionResult === undefined
            ? null
            : JSON.stringify(parsed.data.executionResult),
        status: parsed.data.status,
        summary: parsed.data.summary,
        txSignature: parsed.data.txSignature ?? null,
        simulated: parsed.data.simulated ?? true,
      },
    });

    res.status(201).json({
      id: log.id,
      walletAddress: log.walletAddress,
      commandText: log.commandText,
      parsedIntent: parsed.data.parsedIntent,
      safetyResult: parsed.data.safetyResult ?? null,
      executionResult: parsed.data.executionResult ?? null,
      status: log.status,
      summary: log.summary,
      txSignature: log.txSignature,
      simulated: log.simulated,
      createdAt: log.createdAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
});
