import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import { ActivityIcon, HistoryIcon } from "lucide-react";
import { api } from "@/lib/api";
import type { ActivityItem, ParsedIntent } from "@/types/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

export function ActivityPage() {
  const wallet = useWallet().publicKey?.toBase58();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
                    <TableHead>Mode</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.map((row) => (
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
                      <TableCell>{row.simulated ? "Simulated" : "Saved"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(row.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
