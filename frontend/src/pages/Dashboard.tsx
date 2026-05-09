import { useWallet } from "@solana/wallet-adapter-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type {
  ActivityItem,
  ExecutionResult,
  ParsedIntent,
  PortfolioResponse,
  SafetyCheck,
  UserSettingsDto,
} from "@/types/api";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MicIcon,
  MicOffIcon,
  ShieldAlertIcon,
  SparklesIcon,
  ActivityIcon,
  BrainCircuitIcon,
  GaugeIcon,
  RouteIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  WavesIcon,
} from "lucide-react";

type Phase = "idle" | "analyzing" | "acting";

const QUICK_COMMANDS = [
  { label: "Buy SOL", command: "Buy $5 of SOL" },
  { label: "Swap to JUP", command: "Swap 10 USDC to JUP" },
  { label: "Weekly DCA", command: "Invest $10 every Friday into SOL" },
  { label: "Portfolio", command: "Show my portfolio" },
  { label: "Open activity", command: "Open activity" },
];

export function DashboardPage() {
  const wallet = useWallet();
  const location = useLocation();
  const navigate = useNavigate();
  const address = wallet.publicKey?.toBase58();
  const [commandText, setCommandText] = useState("");
  const voice = useVoiceInput();

  useEffect(() => {
    const state = location.state as { commandText?: string } | null;
    if (!state?.commandText) return;
    setCommandText(state.commandText);
    window.history.replaceState({}, "");
  }, [location.state]);

  useEffect(() => {
    if (!voice.transcript) return;
    setCommandText((prev) =>
      prev ? `${prev} ${voice.transcript}`.trim() : voice.transcript
    );
  }, [voice.transcript]);

  const [intent, setIntent] = useState<ParsedIntent | null>(null);
  const [safety, setSafety] = useState<SafetyCheck | null>(null);
  const [settings, setSettings] = useState<UserSettingsDto | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const reloadCore = useCallback(async () => {
    if (!address) {
      setSettings(null);
      setPortfolio(null);
      setActivity([]);
      return;
    }
    setPortfolioLoading(true);
    setActivityLoading(true);
    try {
      const [settingRes, pf, logs] = await Promise.all([
        api.settingsGet(address),
        api.portfolio(address),
        api.activityList(address),
      ]);
      setSettings(settingRes);
      setPortfolio(pf);
      setActivity(logs);
    } catch {
      /* ignore hydration errors offline */
    } finally {
      setPortfolioLoading(false);
      setActivityLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void reloadCore();
  }, [reloadCore]);

  const analyze = async () => {
    if (!address) {
      setError("Connect a Phantom wallet first.");
      return;
    }
    if (!commandText.trim()) {
      setError("Speak or type a command first.");
      return;
    }
    setPhase("analyzing");
    setError(null);
    setSafety(null);
    setIntent(null);
    try {
      const parsed = await api.parseCommand({
        text: commandText,
        walletAddress: address,
      });
      if (parsed.intent === "navigate" && parsed.route) {
        navigate(parsed.route, {
          state:
            parsed.uiAction === "prefill_buy_command"
              ? { commandText: parsed.prefill?.commandText ?? commandText }
              : undefined,
        });
        return;
      }
      const safe = await api.safetyCheck({
        walletAddress: address,
        parsedIntent: parsed,
      });
      setIntent(parsed);
      setSafety(safe);
      if (parsed.intent === "portfolio") {
        void reloadCore();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parsing failed.");
    } finally {
      setPhase("idle");
    }
  };

  const logActivity = async (payload: {
    status: string;
    summary: string;
    simulated: boolean;
    intent: ParsedIntent;
    safetyResult?: SafetyCheck | null;
    executionResult?: ExecutionResult | null;
  }) => {
    if (!address) return;
    await api.activityPost({
      walletAddress: address,
      commandText: commandText,
      parsedIntent: payload.intent,
      safetyResult: payload.safetyResult ?? safety ?? null,
      executionResult: payload.executionResult ?? null,
      status: payload.status,
      summary: payload.summary,
      simulated: payload.simulated,
    });
    await reloadCore();
  };

  const runConfirmed = async () => {
    if (!address || !intent) return;

    setPhase("acting");
    setError(null);
    try {
      switch (intent.intent) {
        case "buy":
        case "swap": {
          const result = await api.simulateTrade({
            walletAddress: address,
            parsedIntent: intent,
            confirmedByUser: true,
          });
          await logActivity({
            intent,
            simulated: result.simulated,
            status:
              result.status === "skipped" ? "skipped" : "simulated_trade",
            summary: result.summary,
            safetyResult: safety,
            executionResult: result,
          });
          break;
        }
        case "dca_setup":
          await api.dcaCreate({
            walletAddress: address,
            tokenSymbol: intent.tokenOut ?? "SOL",
            amountUsd: intent.amountUsd ?? 0,
            frequency:
              intent.frequency === "daily"
                ? "daily"
                : intent.frequency === "monthly"
                  ? "monthly"
                  : "weekly",
            active: true,
          });
          await logActivity({
            intent,
            simulated: false,
            status: "dca_saved",
            summary: `${intent.summary} — saved locally for demo.`,
            safetyResult: safety,
            executionResult: {
              receiptId: `dca_${Date.now().toString(36)}`,
              routeLabel: `USDC -> ${intent.tokenOut ?? "SOL"}`,
              status: "saved",
              summary: "Recurring rule saved to local SQLite.",
              auditTrail: [
                "Parsed recurring investment intent",
                "Applied wallet guardrails",
                "Saved local DCA rule",
              ],
            },
          });
          break;
        case "settings_max_trade":
          await api.settingsPatch(address, {
            maxTradeUsd: intent.amountUsd ?? settings?.maxTradeUsd ?? 25,
          });
          await logActivity({
            intent,
            simulated: false,
            status: "settings_updated",
            summary: `${intent.summary} — persisted`,
            safetyResult: safety,
            executionResult: {
              receiptId: `settings_${Date.now().toString(36)}`,
              status: "saved",
              summary: "Wallet policy updated in local SQLite.",
              auditTrail: [
                "Parsed settings intent",
                "Applied validation",
                "Persisted wallet policy",
              ],
            },
          });
          break;
        case "portfolio":
          await logActivity({
            intent,
            simulated: false,
            status: "viewed_portfolio",
            summary: intent.summary,
            safetyResult: safety,
            executionResult: {
              receiptId: `portfolio_${Date.now().toString(36)}`,
              status: "viewed",
              summary: "Demo portfolio snapshot refreshed.",
              auditTrail: ["Parsed portfolio intent", "Loaded demo portfolio snapshot"],
            },
          });
          break;
        default:
          setError("Nothing to execute for this command.");
          return;
      }

      setIntent(null);
      setSafety(null);
      setCommandText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirmation failed.");
    } finally {
      setPhase("idle");
      setConfirmOpen(false);
    }
  };

  const canConfirmTrade =
    intent &&
    safety?.approved &&
    ["buy", "swap", "dca_setup", "settings_max_trade", "portfolio"].includes(
      intent.intent
    );

  const topToken = useMemo(() => {
    if (!portfolio?.tokens.length) return null;
    return [...portfolio.tokens].sort((a, b) => b.allocation - a.allocation)[0];
  }, [portfolio]);

  const assistantInsights = useMemo(() => {
    const insights = [
      {
        icon: ShieldCheckIcon,
        label: "Safety",
        value: settings
          ? `Max trade $${settings.maxTradeUsd}`
          : "Connect wallet",
        tone: "text-primary",
      },
      {
        icon: TrendingUpIcon,
        label: "Exposure",
        value: topToken
          ? `${topToken.symbol} leads at ${topToken.allocation.toFixed(0)}%`
          : "No snapshot",
        tone:
          topToken && topToken.allocation > 60
            ? "text-amber-400"
            : "text-emerald-300",
      },
      {
        icon: RouteIcon,
        label: "Agent",
        value: `${activity.length} logged action${activity.length === 1 ? "" : "s"}`,
        tone: "text-sky-300",
      },
    ];
    return insights;
  }, [activity.length, settings, topToken]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Command center
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight lg:text-5xl">
            Voice commands that move through your Solana desk.
          </h1>
          <p className="max-w-lg text-[0.96rem] leading-6 text-muted-foreground">
            Speak a trade, a route, or a portfolio request. Resona turns it into a reviewed action with simulation-first guardrails.
          </p>
        </div>
        <div className="grid min-w-[260px] gap-3 sm:grid-cols-2">
          <div className="metric-tile">
            <p className="text-xs text-muted-foreground">Wallet</p>
            <p className="mt-2 truncate text-sm font-semibold">
              {address
                ? `${address.slice(0, 4)}...${address.slice(-4)}`
                : "Disconnected"}
            </p>
          </div>
          <div className="metric-tile">
            <p className="text-xs text-muted-foreground">Mode</p>
            <p className="mt-2 text-sm font-semibold text-primary">Simulation</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <Card className="glass-panel overflow-hidden">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <WavesIcon className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Speak or draft a directive</p>
                <p className="text-xs text-muted-foreground">
                  Powered by offline browser speech APIs where available.
                </p>
              </div>
            </div>
            {voice.status === "unsupported" && (
              <Alert variant="destructive">
                <AlertTitle>No speech APIs</AlertTitle>
                <AlertDescription>
                  Your browser muted Web Speech APIs — stick to typing.
                </AlertDescription>
              </Alert>
            )}
            {voice.status === "error" && (
              <Alert variant="destructive">
                <AlertTitle>Recognition error</AlertTitle>
                <AlertDescription>Try slowing down pronunciation.</AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={voice.status === "listening" ? "destructive" : "outline"}
                  size="sm"
                  type="button"
                  className="border-white/10 bg-white/[0.035]"
                  disabled={voice.status === "unsupported" || !address}
                  onClick={() =>
                    voice.status === "listening"
                      ? voice.stopListening()
                      : voice.startListening()
                  }
                >
                  {voice.status === "listening" ? (
                    <MicOffIcon className="mr-2 size-4" />
                  ) : (
                    <MicIcon className="mr-2 size-4" />
                  )}
                  {voice.status === "listening" ? "Stop listening" : "Use voice"}
                </Button>
                <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.035]" disabled={!address} type="button" onClick={() => setCommandText("Buy $5 of SOL")}>Try sample · Buy</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_COMMANDS.map((item) => (
                  <Button
                    key={item.command}
                    variant="ghost"
                    size="sm"
                    type="button"
                    disabled={!address}
                    className="h-8 border border-white/10 bg-white/[0.025] px-3 text-xs text-muted-foreground hover:bg-white/[0.07] hover:text-foreground"
                    onClick={() => setCommandText(item.command)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <label className="text-xs uppercase font-semibold text-muted-foreground">Typed command</label>
              <Input
                placeholder="Example: Swap 10 USDC to JUP"
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                aria-label="Command text"
                className="h-12 border-white/10 bg-black/20 text-base"
              />
              <Separator />
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => void analyze()}
                  disabled={phase !== "idle" || !address}
                  className="min-w-[8rem] gap-2 shadow-[0_0_28px_rgb(31_214_184_/_0.16)]"
                >
                  <SparklesIcon className="size-4" />
                  Analyze command
                </Button>
                {phase === "analyzing" && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="mr-3 inline-flex size-2 animate-pulse rounded-full bg-primary" />{" "}
                    Checking intent · safety rails
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          {!address ? (
            <CardFooter className="text-muted-foreground text-xs">
              Connect Phantom (devnet-ready) above to activate voice + safeguards.
            </CardFooter>
          ) : settings ? (
            <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-white/[0.035] text-xs">
              <span>
                Confirmation flow {settings.requireConfirmation ? "guided" : "streamlined"} • Max trade $
                {settings.maxTradeUsd}
              </span>
              <Badge variant="secondary">{settings.simulationMode ? "Simulation enforced" : "Simulation"}</Badge>
            </CardFooter>
          ) : null}
        </Card>

        <div className="space-y-4">
          <Card className="glass-panel">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <ActivityIcon className="size-4 text-primary" />
                <p className="text-sm font-semibold">Portfolio heartbeat</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Lightweight snapshot — labelled demo holdings.
              </p>
            </CardHeader>
            <CardContent>
              {!address ? (
                <Skeleton className="h-36 w-full" />
              ) : portfolioLoading || !portfolio ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-2/5" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-semibold tracking-tight">
                      $
                      {portfolio.totalValueUsd.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <Badge variant="destructive">{portfolio.isDemoData ? "demo data" : "live"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{portfolio.summary}</p>
                  <div className="grid gap-2 pt-2">
                    {portfolio.tokens.slice(0, 4).map((token) => (
                      <div
                        key={token.symbol}
                        className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.025] px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{token.symbol}</span>
                        <span className="text-muted-foreground">
                          {token.allocation.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <GaugeIcon className="size-4 text-primary" />
                <p className="text-sm font-semibold">Interpreted workflow</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!intent ? (
                <p className="text-sm text-muted-foreground">
                  Run Analyze to populate intent previews and safety overlays.
                </p>
              ) : (
                <Fragment>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="outline" className="capitalize">{intent.intent.replace(/_/g, " ")}</Badge>
                    <Badge variant="secondary">
                      Confidence {(intent.confidence * 100).toFixed(1)}%
                    </Badge>
                    {intent.requiresConfirmation && (
                      <Badge variant="outline">manual confirm</Badge>
                    )}
                  </div>
                  <p className="text-base">{intent.summary}</p>
                  <div className="grid gap-1 text-xs text-muted-foreground">
                    {intent.tokenIn && <p>In: {intent.tokenIn}</p>}
                    {intent.tokenOut && <p>Target: {intent.tokenOut}</p>}
                    {intent.amountUsd != null &&
                      Number.isFinite(intent.amountUsd) && (
                      <p>
                        Value: $
                        {intent.amountUsd.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    )}
                    {intent.frequency && <p>Cadence: {intent.frequency}</p>}
                  </div>
                  <Separator />
                  {safety && (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <ShieldAlertIcon className="mt-1 size-4 text-primary" />
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">
                            Safety desk {safety.approved ? "cleared gates" : "blocked"}
                          </p>
                          {!safety.approved &&
                            safety.blockedReasons.map((reason) => (
                              <Alert key={reason} variant="destructive">
                                <AlertTitle>Blocked</AlertTitle>
                                <AlertDescription>{reason}</AlertDescription>
                              </Alert>
                            ))}
                          {safety.approved &&
                            safety.warnings.map((w) => (
                              <Alert key={w}>
                                <AlertTitle>Reminder</AlertTitle>
                                <AlertDescription>{w}</AlertDescription>
                              </Alert>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </Fragment>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                disabled={!canConfirmTrade || phase !== "idle"}
                onClick={() => setConfirmOpen(true)}
              >
                Review & confirm
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BrainCircuitIcon className="size-4 text-primary" />
          <p className="text-sm font-semibold">Assistant brief</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {assistantInsights.map(({ icon: Icon, label, value, tone }) => (
            <div key={label} className="metric-tile">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`mt-2 text-base font-semibold ${tone}`}>{value}</p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                  <Icon className="size-5 text-primary" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Recent activity</p>
              <p className="text-xs text-muted-foreground">Locally persisted narration log.</p>
            </div>
            <Badge variant="secondary">{activity.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!address ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Connect wallet to hydrate history.</p>
          ) : activityLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : activity.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">
              No rehearsals yet · run Analyze + Confirm once.
            </p>
          ) : (
            <ScrollArea className="h-[min(420px,calc(100vh-520px))]">
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Summary</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sim?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.slice(0, 40).map((row) => {
                    const intentLabel =
                      typeof row.parsedIntent === "object" &&
                      row.parsedIntent &&
                      "intent" in row.parsedIntent
                        ? String(
                            (row.parsedIntent as ParsedIntent).intent ?? "—"
                          )
                        : "—";
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.summary}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{intentLabel.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-xs uppercase tracking-wide">{row.status}</TableCell>
                        <TableCell className="text-xs">{row.simulated ? "Yes" : "No"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solidify rehearsal</DialogTitle>
            <DialogDescription>
              Simulation only — Jupiter routing is paused for stability. You still need to tap Confirm.
            </DialogDescription>
          </DialogHeader>
          {intent ? (
            <div className="space-y-2 text-sm">
              <p>{intent.summary}</p>
              {settings?.requireConfirmation ? (
                <Alert>
                  <AlertTitle>Hands-on reassurance</AlertTitle>
                  <AlertDescription>
                    We keep confirmations on so every swap or buy rehearsal is purposeful.
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Streamlined confirmations in settings — Resona still waits for your tap below.
                </p>
              )}
            </div>
          ) : null}
          <DialogFooter className="gap-3 sm:flex-row sm:flex-wrap">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} type="button">
              Pause
            </Button>
            <Button
              onClick={() => void runConfirmed()}
              disabled={
                phase !== "idle" ||
                !intent ||
                !safety?.approved ||
                !["buy", "swap", "dca_setup", "settings_max_trade", "portfolio"].includes(
                  intent.intent
                )
              }
              type="button"
            >
              Confirm & simulate / save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
