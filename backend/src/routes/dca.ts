import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { dcaPatchSchema, dcaPostSchema } from "../schemas/api.js";
import { sendZod } from "../middleware/errors.js";
import { getOrCreateSettings } from "../services/userSettings.js";

export const dcaRouter = Router();

const walletParam = z.string().min(32).max(64);

function nextRunFor(frequency: string): Date {
  const d = new Date();
  if (frequency === "daily") d.setDate(d.getDate() + 1);
  else if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

dcaRouter.get("/dca/:walletAddress", async (req, res, next) => {
  try {
    const w = walletParam.safeParse(req.params.walletAddress);
    if (!w.success) return sendZod(res, w.error);
    await getOrCreateSettings(w.data);
    const rules = await prisma.dcaRule.findMany({
      where: { walletAddress: w.data },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      rules.map((r) => ({
        id: r.id,
        walletAddress: r.walletAddress,
        tokenSymbol: r.tokenSymbol,
        amountUsd: r.amountUsd,
        frequency: r.frequency,
        active: r.active,
        nextRunAt: r.nextRunAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))
    );
  } catch (e) {
    next(e);
  }
});

dcaRouter.post("/dca", async (req, res, next) => {
  try {
    const parsed = dcaPostSchema.safeParse(req.body);
    if (!parsed.success) return sendZod(res, parsed.error);
    await getOrCreateSettings(parsed.data.walletAddress);
    const nextRunAt = nextRunFor(parsed.data.frequency);
    const rule = await prisma.dcaRule.create({
      data: {
        walletAddress: parsed.data.walletAddress,
        tokenSymbol: parsed.data.tokenSymbol.toUpperCase(),
        amountUsd: parsed.data.amountUsd,
        frequency: parsed.data.frequency,
        active: parsed.data.active ?? true,
        nextRunAt,
      },
    });
    res.status(201).json({
      id: rule.id,
      walletAddress: rule.walletAddress,
      tokenSymbol: rule.tokenSymbol,
      amountUsd: rule.amountUsd,
      frequency: rule.frequency,
      active: rule.active,
      nextRunAt: rule.nextRunAt?.toISOString() ?? null,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

dcaRouter.patch("/dca/:id", async (req, res, next) => {
  try {
    const id = z.string().cuid().safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: "Invalid rule id" });
    const parsed = dcaPatchSchema.safeParse(req.body);
    if (!parsed.success) return sendZod(res, parsed.error);

    const existing = await prisma.dcaRule.findUnique({ where: { id: id.data } });
    if (!existing) return res.status(404).json({ error: "DCA rule not found" });

    const nextRunAt =
      parsed.data.nextRunAt !== undefined
        ? parsed.data.nextRunAt
          ? new Date(parsed.data.nextRunAt)
          : null
        : undefined;

    const rule = await prisma.dcaRule.update({
      where: { id: id.data },
      data: {
        tokenSymbol: parsed.data.tokenSymbol?.toUpperCase(),
        amountUsd: parsed.data.amountUsd,
        frequency: parsed.data.frequency,
        active: parsed.data.active,
        ...(nextRunAt !== undefined ? { nextRunAt } : {}),
      },
    });
    res.json({
      id: rule.id,
      walletAddress: rule.walletAddress,
      tokenSymbol: rule.tokenSymbol,
      amountUsd: rule.amountUsd,
      frequency: rule.frequency,
      active: rule.active,
      nextRunAt: rule.nextRunAt?.toISOString() ?? null,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

dcaRouter.delete("/dca/:id", async (req, res, next) => {
  try {
    const id = z.string().cuid().safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: "Invalid rule id" });
    await prisma.dcaRule.delete({ where: { id: id.data } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "DCA rule not found" });
  }
});
