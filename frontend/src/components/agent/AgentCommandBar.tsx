import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { BotIcon, Loader2Icon, MicIcon, MicOffIcon, SendIcon } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const NAV_INTENT = "navigate";

export function AgentCommandBar({ className }: { className?: string }) {
  const wallet = useWallet();
  const address = wallet.publicKey?.toBase58();
  const navigate = useNavigate();
  const voice = useVoiceInput();

  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!voice.transcript) return;
    setText(voice.transcript);
  }, [voice.transcript]);

  const run = async () => {
    const command = text.trim();
    if (!command) return;
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const parsed = await api.parseCommand({
        text: command,
        walletAddress: address,
      });

      if (parsed.intent !== NAV_INTENT || !parsed.route) {
        setStatus(
          parsed.intent === "unknown"
            ? parsed.summary
            : "Trade commands stay in the dashboard review flow."
        );
        if (parsed.intent !== "unknown") {
          navigate("/dashboard", { state: { commandText: command } });
        }
        return;
      }

      if (parsed.confidence < 0.75) {
        setStatus("I am not sure where to go. Try open portfolio or open settings.");
        return;
      }

      setStatus(parsed.summary);
      setText("");
      navigate(parsed.route, {
        state:
          parsed.uiAction === "prefill_buy_command"
            ? { commandText: parsed.prefill?.commandText ?? command }
            : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent command failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex min-w-0 items-center gap-2 rounded-lg border border-primary/20 bg-black/24 px-2 py-2 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.06),0_14px_40px_rgb(0_0_0_/_0.22)] backdrop-blur-xl">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/14 text-primary">
          <BotIcon className="size-4" />
        </div>
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void run();
          }}
          placeholder="Open portfolio, show DCA, start buying SOL"
          aria-label="AI navigation command"
          className="h-8 border-0 bg-transparent px-1 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
        />
        <Button
          variant={voice.status === "listening" ? "destructive" : "ghost"}
          size="icon-sm"
          type="button"
          className="text-muted-foreground hover:bg-white/8 hover:text-foreground"
          disabled={voice.status === "unsupported" || busy}
          aria-label={voice.status === "listening" ? "Stop voice input" : "Start voice input"}
          onClick={() =>
            voice.status === "listening"
              ? voice.stopListening()
              : voice.startListening()
          }
        >
          {voice.status === "listening" ? (
            <MicOffIcon className="size-4" />
          ) : (
            <MicIcon className="size-4" />
          )}
        </Button>
        <Button
          size="icon-sm"
          type="button"
          className="shadow-[0_0_24px_rgb(31_214_184_/_0.16)]"
          disabled={busy || !text.trim()}
          aria-label="Run agent command"
          onClick={() => void run()}
        >
          {busy ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <SendIcon className="size-4" />
          )}
        </Button>
      </div>
      {(status || error) && (
        <div className="flex items-center gap-2">
          <Badge variant={error ? "destructive" : "secondary"} className="max-w-full whitespace-normal">
            {error ?? status}
          </Badge>
        </div>
      )}
    </div>
  );
}
