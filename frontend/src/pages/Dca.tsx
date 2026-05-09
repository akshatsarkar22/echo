import { useWallet } from "@solana/wallet-adapter-react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { DcaRuleDto } from "@/types/api";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trash2Icon,
  Clock3Icon,
} from "lucide-react";

const TOKEN_OPTIONS = ["SOL", "JUP", "BONK", "USDC", "RAY", "ETH", "BTC", "WIF"];

export function DcaPage() {
  const wallet = useWallet().publicKey?.toBase58();
  const [rules, setRules] = useState<DcaRuleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [token, setToken] = useState("SOL");
  const [amountUsd, setAmountUsd] = useState("10");
  const [frequency, setFrequency] =
    useState<"weekly" | "daily" | "monthly">("weekly");
  const [activeDraft, setActiveDraft] = useState(true);

  const load = useCallback(async () => {
    if (!wallet) {
      setRules([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.dcaList(wallet);
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "DCA fetch failed.");
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void load();
  }, [load]);

  const freqLabelMap: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
  };

  const submit = async () => {
    if (!wallet) return;
    try {
      setError(null);
      const amount = Number(amountUsd || "0");
      if (!amount || Number.isNaN(amount) || amount <= 0) throw new Error("Amount must be meaningful.");
      await api.dcaCreate({
        walletAddress: wallet,
        tokenSymbol: token,
        amountUsd: amount,
        frequency,
        active: activeDraft,
      });
      setAmountUsd("10");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    }
  };

  const toggleRule = async (rule: DcaRuleDto, nextActive: boolean) => {
    try {
      await api.dcaPatch(rule.id, { active: nextActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const removeRule = async (id: string) => {
    try {
      await api.dcaDelete(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Auto-invest
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight lg:text-[2.45rem]">
          Human cadence reminders for disciplined buys.
        </h1>
        <p className="max-w-2xl text-muted-foreground text-[0.95rem]">
          Rules stay on-device-ish — EchoTrade persists them in SQLite linked to each wallet rehearsal key.
        </p>
      </div>

      {!wallet ? (
        <Alert>
          <Clock3Icon />
          <AlertTitle>Wallet paused</AlertTitle>
          <AlertDescription>Reconnect wallet to blueprint rules.</AlertDescription>
        </Alert>
      ) : (
        <Fragment>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,410px)_minmax(320px,1fr)] items-start">
            <Card className="border-border/70">
              <CardHeader className="space-y-2">
                <p className="text-sm font-semibold">Composer</p>
                <p className="text-muted-foreground text-xs">
                  Pick a staple asset, nominate an amount, EchoTrade echoes the tempo.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="space-y-2">
                  <Label>Token sleeve</Label>
                  <Select
                    value={token}
                    onValueChange={(v) => {
                      if (v) setToken(v);
                    }}
                  >
                    <SelectTrigger aria-label="Token">
                      <SelectValue placeholder="Token" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {TOKEN_OPTIONS.map((sym) => (
                          <SelectItem key={sym} value={sym}>
                            {sym}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dca-amt">Amount (USD rehearsal)</Label>
                  <Input
                    id="dca-amt"
                    type="number"
                    min={1}
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    step="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={frequency}
                    onValueChange={(v) =>
                      setFrequency(v as "daily" | "weekly" | "monthly")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Active rehearsal</p>
                    <p className="text-xs text-muted-foreground">
                      Flip inactive to park the cadence quietly.
                    </p>
                  </div>
                  <Switch
                    checked={activeDraft}
                    onCheckedChange={(v) => setActiveDraft(Boolean(v))}
                    aria-label="Active rule"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" type="button" onClick={() => void submit()} disabled={!wallet}>
                  Save rule locally
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-border/70 overflow-hidden">
              <CardHeader className="space-y-1">
                <p className="text-sm font-semibold">Tracked cadences</p>
                <p className="text-xs text-muted-foreground">{rules.length} total</p>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTitle>DCA issue</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {!wallet || loading ? (
                  <Skeleton className="h-48 w-full" />
                ) : rules.length === 0 ? (
                  <p className="text-muted-foreground py-14 text-center text-sm">
                    No saved cadences — craft one beside this column.
                  </p>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Sleeve</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Tempo</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-semibold">{rule.tokenSymbol}</TableCell>
                          <TableCell>
                            $
                            {rule.amountUsd.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>
                            {freqLabelMap[rule.frequency as keyof typeof freqLabelMap] ??
                              rule.frequency}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={rule.active}
                              onCheckedChange={(v) =>
                                void toggleRule(rule, Boolean(v))
                              }
                              aria-label={`Toggle rule ${rule.id}`}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              type="button"
                              className="text-destructive"
                              aria-label={`Delete rule ${rule.id}`}
                              onClick={() => void removeRule(rule.id)}
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </Fragment>
      )}
    </div>
  );
}
