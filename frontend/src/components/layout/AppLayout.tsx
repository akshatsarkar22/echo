import { Link, Outlet, NavLink } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { cn } from "@/lib/utils";
import { AgentCommandBar } from "@/components/agent/AgentCommandBar";
import { Badge } from "@/components/ui/badge";
import {
  PieChartIcon,
  Settings2Icon,
  LayoutDashboardIcon,
  RepeatIcon,
  MenuIcon,
  HistoryIcon,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { to: "/portfolio", label: "Portfolio", icon: PieChartIcon },
  { to: "/dca", label: "Auto-invest", icon: RepeatIcon },
  { to: "/activity", label: "Activity", icon: HistoryIcon },
  { to: "/settings", label: "Settings", icon: Settings2Icon },
];

function NavPills({
  orientation = "row",
}: {
  orientation?: "row" | "col";
}) {
  return (
    <div
      className={cn(
        "gap-2",
        orientation === "row"
          ? "flex flex-row flex-wrap"
          : "flex flex-col"
      )}
    >
      {nav.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "rounded-lg px-4 py-2 text-sm transition-colors hover:bg-white/[0.06]",
              orientation === "row" ? "" : "w-full justify-start inline-flex gap-2 items-center text-left border border-transparent hover:border-border",
              isActive
                ? "border border-primary/30 bg-primary/12 font-medium text-primary shadow-[0_0_28px_rgb(31_214_184_/_0.08)]"
                : "text-muted-foreground"
            )
          }
        >
          <span className="inline-flex gap-2 items-center">
            <Icon className="size-4" /> {label}
          </span>
        </NavLink>
      ))}
    </div>
  );
}

export function AppLayout() {
  return (
    <div className="relative min-h-dvh flex flex-col overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/78 backdrop-blur-xl supports-[backdrop-filter]:bg-background/68">
        <div className="mx-auto grid w-full max-w-6xl gap-3 px-4 py-4 lg:grid-cols-[minmax(190px,0.75fr)_minmax(280px,1.05fr)_auto] lg:items-center">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary text-sm font-semibold text-primary-foreground shadow-[0_0_32px_rgb(31_214_184_/_0.22)]">
              Re
            </div>
            <div className="text-left hidden sm:block">
              <Link
                to="/dashboard"
                className="text-base font-semibold tracking-tight"
              >
                Resona
              </Link>
              <p className="text-muted-foreground text-xs">
                Voice-first Solana practice desk
              </p>
            </div>
          </div>
          <div className="min-w-0">
            <AgentCommandBar />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="md:hidden shrink-0"
                    aria-label="Open menu"
                    type="button"
                  />
                }
              >
                <MenuIcon className="size-4" />
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(320px,100vw)] pt-14">
                <SheetHeader className="text-left">
                  <SheetTitle>Navigate</SheetTitle>
                </SheetHeader>
                <div className="mt-8 flex flex-col gap-8">
                  <NavPills orientation="col" />
                  <Badge variant="secondary" className="w-fit">
                    Demo mode · Quotes & balances are mocked
                  </Badge>
                </div>
              </SheetContent>
            </Sheet>
            <WalletMultiButton />
          </div>
        </div>
        <div className="hidden border-t border-white/10 bg-black/12 px-4 py-2 md:block">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <NavPills orientation="row" />
            <Badge variant="secondary" className="max-w-[18rem] border border-white/10 bg-white/[0.055] text-muted-foreground">
              Demo mode · Quotes & balances are mocked
            </Badge>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:py-12">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-white/10 py-10 text-center text-muted-foreground text-xs">
        Simulated executions only · No financial advice · Self-custody aware
      </footer>
    </div>
  );
}
