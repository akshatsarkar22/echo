import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";

export function zodErrors(err: ZodError) {
  return err.flatten().fieldErrors;
}

export function sendZod(res: Response, err: ZodError) {
  return res.status(400).json({
    error: "Validation failed",
    details: err.flatten().fieldErrors,
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
