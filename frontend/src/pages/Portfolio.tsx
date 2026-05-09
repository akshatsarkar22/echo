import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { PortfolioResponse } from "@/types/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Radar,
  ShieldCheck,
  LineChart,
} from "lucide-react";

function riskTone(allocationPeak: number) {
  if (allocationPeak >= 65) return { label: "Concentrated", tone: "text-amber-600" };
  if (allocationPeak >= 45) return { label: "Balanced-ish", tone: "text-primary" };
  return { label: "Diffuse", tone: "text-emerald-600" };
}

export function PortfolioPage() {
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58();

  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!wallet) {
        setData(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await api.portfolio(wallet);
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Could not sync portfolio.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  const peak = useMemo(
    () => (data?.tokens ?? []).reduce((m, row) => Math.max(m, row.allocation), 0),
    [data]
  );

  const risk = riskTone(peak);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          Portfolio cockpit
        </p>
        <h1 className="text-balance text-3xl lg:text-[2.4rem] font-semibold tracking-tight">
          Allocation clarity without the noise.
        </h1>
        <p className="max-w-xl text-muted-foreground text-[0.95rem]">
          Everything here is illustrative — perfect for rehearsals before you plug in live balance APIs.
        </p>
      </div>

      {!wallet ? (
        <Alert>
          <Radar className="size-4 text-primary" />
          <AlertTitle>Wallet required</AlertTitle>
          <AlertDescription>Connect Phantom to hydrate this storyboard.</AlertDescription>
        </Alert>
      ) : loading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Sync issue</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(340px,0.82fr)]">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Net indicative value</p>
                  <p className="text-4xl font-semibold tracking-tight">
                    $
                    {data.totalValueUsd.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <Badge variant={data.isDemoData ? "secondary" : "default"}>
                  {data.isDemoData ? "demo holdings" : "live-ish"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.tokens.map((token) => (
                <div key={token.symbol} className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{token.symbol}</span>
                    <span>
                      $
                      {token.valueUsd.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      <span className="text-muted-foreground ml-3 text-xs">
                        {token.allocation.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                  <Progress value={Math.min(token.allocation, 100)} />
                  <Separator className="opacity-40" />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="space-y-1">
                <div className="flex items-start gap-2">
                  <LineChart className="size-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Plain english read</p>
                    <p className="text-sm text-muted-foreground">{data.summary}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                    Risk temperament
                  </p>
                  <div className="mt-4 flex gap-6">
                    <div>
                      <p className={`text-2xl font-semibold ${risk.tone}`}>{risk.label}</p>
                      <p className="text-xs uppercase text-muted-foreground">
                        Highest sleeve {peak.toFixed(1)}%
                      </p>
                    </div>
                    <Badge variant="outline" className="self-start capitalize">
                      {risk.label.split(" ").join(" · ").toLowerCase()}
                    </Badge>
                  </div>
                  <Separator className="my-6" />
                  <div className="flex gap-3 text-muted-foreground text-sm">
                    <ShieldCheck className="size-4 text-primary shrink-0" />{" "}
                    Resona anchors on calm defaults — escalate limits in Settings whenever you rehearse bolder flows.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
