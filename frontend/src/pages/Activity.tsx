import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import { ActivityIcon, FileSearchIcon, HistoryIcon } from "lucide-react";
import { api } from "@/lib/api";
import type { ActivityItem, ExecutionResult, ParsedIntent, SafetyCheck } from "@/types/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function intentLabel(row: ActivityItem) {
  const parsed = row.parsedIntent;
  if (!parsed || typeof parsed !== "object" || !("intent" in parsed)) return "unknown";
  return String((parsed as ParsedIntent).intent ?? "unknown").replace(/_/g, " ");
}

function safetySnapshot(row: ActivityItem): SafetyCheck | null {
  const safety = row.safetyResult;
  if (!safety || typeof safety !== "object" || !("approved" in safety)) return null;
  return safety as SafetyCheck;
}

function executionSnapshot(row: ActivityItem): ExecutionResult | null {
  const execution = row.executionResult;
  if (!execution || typeof execution !== "object") return null;
  return execution as ExecutionResult;
}

export function ActivityPage() {
  const wallet = useWallet().publicKey?.toBase58();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ActivityItem | null>(null);

  const load = useCallback(async () => {
    if (!wallet) {
      setActivity([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await api.activityList(wallet);
      setActivity(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activity fetch failed.");
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Activity
        </p>
        <h1 className="text-3xl font-semibold tracking-tight lg:text-[2.45rem]">
          Command history with simulated execution receipts.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Every confirmed rehearsal is logged per wallet so the assistant can show what happened.
        </p>
      </div>

      {!wallet ? (
        <Alert>
          <HistoryIcon className="size-4 text-primary" />
          <AlertTitle>Wallet required</AlertTitle>
          <AlertDescription>Connect Phantom to load your local activity timeline.</AlertDescription>
        </Alert>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Activity issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          <Card className="overflow-hidden border-border/70">
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
              <div className="flex items-start gap-3">
                <ActivityIcon className="mt-1 size-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Timeline</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.length} stored command{activity.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">SQLite</Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-80 w-full" />
              ) : activity.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No activity yet. Confirm a dashboard command to create the first entry.
                </p>
              ) : (
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Command</TableHead>
                      <TableHead>Intent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Evidence</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Inspect</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activity.map((row) => {
                      const safety = safetySnapshot(row);
                      const execution = executionSnapshot(row);
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="max-w-[26rem]">
                            <p className="font-medium">{row.summary}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {row.commandText}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {intentLabel(row)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs uppercase tracking-wide">
                            {row.status}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant={safety?.approved === false ? "destructive" : "secondary"}>
                                {safety ? (safety.approved ? "cleared" : "blocked") : "legacy"}
                              </Badge>
                              {execution?.receiptId && (
                                <Badge variant="outline">receipt</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(row.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              type="button"
                              aria-label={`Inspect ${row.id}`}
                              onClick={() => setSelected(row)}
                            >
                              <FileSearchIcon className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Rehearsal evidence</DialogTitle>
              </DialogHeader>
              {selected ? (
                <div className="space-y-5 text-sm">
                  <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Badge variant="outline" className="capitalize">
                        {intentLabel(selected)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(selected.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{selected.summary}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{selected.commandText}</p>
                    </div>
                  </div>

                  {(() => {
                    const safety = safetySnapshot(selected);
                    const execution = executionSnapshot(selected);
                    return (
                      <>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="metric-tile">
                            <p className="text-xs text-muted-foreground">Safety</p>
                            <p className="mt-2 font-semibold">
                              {safety ? (safety.approved ? "Cleared" : "Blocked") : "Not stored"}
                            </p>
                          </div>
                          <div className="metric-tile">
                            <p className="text-xs text-muted-foreground">Route</p>
                            <p className="mt-2 truncate font-semibold">
                              {execution?.routeLabel ?? "No route"}
                            </p>
                          </div>
                          <div className="metric-tile">
                            <p className="text-xs text-muted-foreground">Receipt</p>
                            <p className="mt-2 truncate font-semibold">
                              {execution?.receiptId ?? selected.id}
                            </p>
                          </div>
                        </div>

                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Guardrails
                            </p>
                            {safety ? (
                              <div className="space-y-2">
                                {[...safety.blockedReasons, ...safety.warnings].map((item) => (
                                  <Alert
                                    key={item}
                                    variant={safety.blockedReasons.includes(item) ? "destructive" : "default"}
                                  >
                                    <AlertDescription>{item}</AlertDescription>
                                  </Alert>
                                ))}
                              </div>
                            ) : (
                              <p className="text-muted-foreground">This entry predates safety snapshots.</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Execution Trace
                            </p>
                            {execution?.estimatedOutput && (
                              <p className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                Estimated output: {execution.estimatedOutput}
                              </p>
                            )}
                            <div className="space-y-2">
                              {(execution?.auditTrail ?? ["No trace stored for this entry."]).map((item) => (
                                <div
                                  key={item}
                                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-muted-foreground"
                                >
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
