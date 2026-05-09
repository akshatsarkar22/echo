import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult?: ((event: SpeechResultEvent) => void) | null;
  onerror?: (() => void) | null;
  onend?: (() => void) | null;
};

type SpeechResultEvent = {
  results: ArrayLike<{ 0?: { transcript: string } | undefined }>;
};

function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type VoiceInputState =
  | { status: "idle" | "listening" | "unsupported" | "error"; transcript: string };

export function useVoiceInput(language = "en-US") {
  const [state, setState] = useState<VoiceInputState>({
    status: getRecognitionCtor() ? "idle" : "unsupported",
    transcript: "",
  });
  const recRef = useRef<InstanceType<RecognitionCtor> | null>(null);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = language;
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (event: SpeechResultEvent) => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      setState({ status: "idle", transcript: text.trim() });
    };
    r.onerror = () => setState({ status: "error", transcript: "" });
    r.onend = () =>
      setState((s) =>
        s.status === "listening" ? { ...s, status: "idle" } : s
      );
    recRef.current = r;
    return () => r.abort();
  }, [language]);

  const startListening = useCallback(() => {
    const r = recRef.current;
    if (!r) {
      setState({ status: "unsupported", transcript: "" });
      return;
    }
    try {
      r.start();
      setState({ status: "listening", transcript: "" });
    } catch {
      setState({ status: "idle", transcript: "" });
      try {
        r.start();
      } catch {
        /* noop */
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    setState((s) =>
      s.status === "listening" ? { ...s, status: "idle" } : s
    );
  }, []);

  return { ...state, startListening, stopListening };
}
