import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { UserSettingsDto } from "@/types/api";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheckIcon,
} from "lucide-react";

function parseTokenList(payload: string) {
  return payload
    .split(/[\,\n\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function SettingsPage() {
  const wallet = useWallet().publicKey?.toBase58();
  const [settings, setSettings] = useState<UserSettingsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [maxTradeUsd, setMaxTradeUsd] = useState("25");
  const [confirmation, setConfirmation] = useState(true);
  const [simMode, setSimMode] = useState(true);
  const [allowed, setAllowed] = useState("SOL USDC JUP BONK");
  const [blocked, setBlocked] = useState("");
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!wallet) {
      setSettings(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.settingsGet(wallet);
      setSettings(res);
      setMaxTradeUsd(String(res.maxTradeUsd));
      setConfirmation(res.requireConfirmation);
      setSimMode(res.simulationMode);
      setAllowed(res.allowedTokens.join(" "));
      setBlocked(res.blockedTokens.join(" "));
      setRisk(
        res.riskLevel === "high" || res.riskLevel === "low"
          ? res.riskLevel
          : "medium"
      );
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!wallet) return;
    try {
      setSaving(true);
      setError(null);
      const amt = Number(maxTradeUsd || "0");
      if (!(amt > 0)) throw new Error("Max trade USD must exceed zero.");
      const updated = await api.settingsPatch(wallet, {
        maxTradeUsd: amt,
        requireConfirmation: confirmation,
        allowedTokens: parseTokenList(allowed),
        blockedTokens: parseTokenList(blocked),
        riskLevel: risk,
        simulationMode: simMode,
      });
      setSettings(updated);
      setRisk(updated.riskLevel as typeof risk);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to persist settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Guardrails studio
        </p>
        <h1 className="text-3xl font-semibold tracking-tight lg:text-[2.45rem]">
          Dial in reassurance before any rehearsal capital moves.
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Thresholds persist per wallet fingerprint — SQLite friendly for local MVPs.
        </p>
      </div>

      {!wallet ? (
        <Alert>
          <AlertTitle>Wallet missing</AlertTitle>
          <AlertDescription>Open Phantom to personalize guardrails.</AlertDescription>
        </Alert>
      ) : loading ? (
        <Skeleton className="h-[520px] w-full" />
      ) : (
        <Card className="border-border/70 max-w-3xl">
          <CardHeader className="space-y-2">
            <div className="flex items-start gap-2">
              <ClipboardCheckIcon className="size-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Wallet policy</p>
                <p className="text-xs text-muted-foreground">
                  {wallet.slice(0, 5)} … {wallet.slice(-5)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="usd-max">Max trade rehearsal (USD)</Label>
              <Input
                id="usd-max"
                type="number"
                step="1"
                min={1}
                value={maxTradeUsd}
                onChange={(e) => setMaxTradeUsd(e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center justify-between gap-5 rounded-xl border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Confirm dialogs</p>
                  <p className="text-xs text-muted-foreground">Extra reassurance copy.</p>
                </div>
                <Switch
                  checked={confirmation}
                  onCheckedChange={(value) => setConfirmation(Boolean(value))}
                  aria-label="Require confirmations"
                />
              </div>
              <div className="flex items-center justify-between gap-5 rounded-xl border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Simulation only</p>
                  <p className="text-xs text-muted-foreground">
                    Locks UI into rehearsable sends.
                  </p>
                </div>
                <Switch
                  checked={simMode}
                  onCheckedChange={(value) => setSimMode(Boolean(value))}
                  aria-label="Simulation mode"
                />
              </div>
              <div className="rounded-xl border px-4 py-3 space-y-2">
                <Label>Risk temperament</Label>
                <Select
                  value={risk}
                  onValueChange={(v) => setRisk(v as typeof risk)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low pulse</SelectItem>
                    <SelectItem value="medium">Measured drift</SelectItem>
                    <SelectItem value="high">Spicy rehearsal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Allowed rehearsal tokens</Label>
              <Textarea rows={4} value={allowed} onChange={(e) => setAllowed(e.target.value)} placeholder="Separate with spaces or commas" />
            </div>
            <div className="space-y-2">
              <Label>Blocked tokens</Label>
              <Textarea rows={3} value={blocked} onChange={(e) => setBlocked(e.target.value)} placeholder="Leave empty when nothing is banned" />
            </div>

            <Alert>
              <AlertTitle>Operational truth</AlertTitle>
              <AlertDescription className="text-xs">
                Empty allowlists mean Resona skips extra token gating besides the built-in known list —
                tighten up when rehearsals should stay boring.
              </AlertDescription>
            </Alert>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              Save guardrails
            </Button>
            {settings && (
              <p className="ml-auto text-muted-foreground text-xs">
                Max ${settings.maxTradeUsd} · Risk {settings.riskLevel}
              </p>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
