"use client";

import { useCallback, useRef, useState } from "react";
import type { Citation, ChatFrame } from "@mios/shared";
import { chatStream } from "@/lib/api";
import { getClientToken } from "@/lib/api/token";
import { sseFrames } from "@/lib/api/sse";
import { ApiError } from "@/lib/api/fetcher";
import { useT } from "@/lib/i18n/useT";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations: Citation[];
  streaming: boolean;
  provider?: string;
  feedback?: "up" | "down";
}

/**
 * Chat state and the streaming call.
 *
 * The browser talks to FastAPI directly rather than proxying through a Vercel route
 * handler — a grounded answer can take tens of seconds, and function duration limits
 * would truncate it mid-sentence.
 */
export function useChat() {
  const { t } = useT();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || busy) return;

      setError("");
      const assistantId = `a-${Date.now()}`;
      setMessages((current) => [
        ...current,
        { id: `u-${Date.now()}`, role: "user", text: trimmed, citations: [], streaming: false },
        { id: assistantId, role: "assistant", text: "", citations: [], streaming: true },
      ]);
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const patch = (updater: (message: ChatMessage) => ChatMessage) =>
        setMessages((current) =>
          current.map((message) => (message.id === assistantId ? updater(message) : message)),
        );

      try {
        const token = await getClientToken();
        const response = await chatStream({ token }, trimmed, controller.signal);

        for await (const frame of sseFrames<ChatFrame>(response)) {
          if (frame.type === "citations") {
            patch((message) => ({ ...message, citations: frame.citations }));
          } else if (frame.type === "token") {
            patch((message) => ({ ...message, text: message.text + frame.value }));
          } else if (frame.type === "done") {
            patch((message) => ({ ...message, streaming: false }));
          }
        }
        patch((message) => ({ ...message, streaming: false }));
      } catch (cause) {
        if (controller.signal.aborted) {
          // User pressed Stop: keep whatever streamed, just close the message out.
          patch((message) => ({ ...message, streaming: false }));
        } else {
          setError(cause instanceof ApiError ? cause.localized(t) : t.common.unknownError);
          patch((message) => ({ ...message, streaming: false }));
        }
      } finally {
        abortRef.current = null;
        setBusy(false);
      }
    },
    [busy, t],
  );

  const setFeedback = useCallback((id: string, value: "up" | "down") => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, feedback: value } : message)),
    );
  }, []);

  return { messages, busy, error, ask, stop, setFeedback };
}
