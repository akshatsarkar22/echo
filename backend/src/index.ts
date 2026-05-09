import express from "express";
import cors from "cors";
import { parseCommandRouter } from "./routes/parseCommand.js";
import { safetyRouter } from "./routes/safety.js";
import { portfolioRouter } from "./routes/portfolio.js";
import { simulateRouter } from "./routes/simulate.js";
import { dcaRouter } from "./routes/dca.js";
import { settingsRouter } from "./routes/settings.js";
import { activityRouter } from "./routes/activity.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json());

const api = express.Router();

api.use(parseCommandRouter);
api.use(safetyRouter);
api.use(portfolioRouter);
api.use(simulateRouter);
api.use(dcaRouter);
api.use(settingsRouter);
api.use(activityRouter);

app.use("/api", api);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Resona API listening on http://localhost:${port}`);
});
