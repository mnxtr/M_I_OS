"use client";

import { useEffect, useRef, useState } from "react";
import { ThumbsUp, ThumbsDown, Square, Send } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import { useChat, type ChatMessage } from "./useChat";
import { CitationChip } from "./CitationChip";
import { CitationDrawer } from "./CitationDrawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Panel, ErrorBanner, Badge } from "@/components/ui/panel";
import { submitAnswerFeedback } from "@/app/(app)/ask/actions";
import { cn } from "@/lib/utils";

export function ChatSurface({ hasDocuments }: { hasDocuments: boolean }) {
  const { t } = useT();
  const { messages, busy, error, ask, stop, setFeedback } = useChat();
  const [question, setQuestion] = useState("");
  const [drawerFor, setDrawerFor] = useState<{ messageId: string; index: number } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = question;
    setQuestion("");
    void ask(value);
  }

  const activeMessage = messages.find((message) => message.id === drawerFor?.messageId);

  return (
    <div className="flex h-[calc(100dvh-11rem)] min-h-96 flex-col gap-3">
      <div className="flex-1 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <EmptyChat hasDocuments={hasDocuments} onPick={(sample) => void ask(sample)} />
        ) : (
          <ol className="grid gap-4">
            {messages.map((message) => (
              <li key={message.id}>
                <MessageBubble
                  message={message}
                  onOpenSource={(index) => setDrawerFor({ messageId: message.id, index })}
                  onFeedback={async (value) => {
                    setFeedback(message.id, value);
                    await submitAnswerFeedback({
                      question:
                        messages[messages.indexOf(message) - 1]?.text ?? "",
                      answerPreview: message.text.slice(0, 500),
                      helpful: value === "up",
                      citationCount: message.citations.length,
                    });
                  }}
                />
              </li>
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <ErrorBanner>{error}</ErrorBanner>

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <Textarea
          rows={2}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit(event);
            }
          }}
          placeholder={t.ask.placeholder}
          aria-label={t.ask.placeholder}
          className="resize-none"
        />
        {busy ? (
          <Button type="button" variant="ghost" onClick={stop}>
            <Square className="size-4" />
            {t.ask.stopGenerating}
          </Button>
        ) : (
          <Button type="submit" disabled={!question.trim()}>
            <Send className="size-4" />
            {t.ask.send}
          </Button>
        )}
      </form>

      {activeMessage ? (
        <CitationDrawer
          citations={activeMessage.citations}
          openIndex={drawerFor?.index ?? null}
          onOpenChange={(open) => {
            if (!open) setDrawerFor(null);
          }}
        />
      ) : null}
    </div>
  );
}

function MessageBubble({
  message,
  onOpenSource,
  onFeedback,
}: {
  message: ChatMessage;
  onOpenSource: (index: number) => void;
  onFeedback: (value: "up" | "down") => void;
}) {
  const { t } = useT();

  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-panel bg-accent-dark px-4 py-2.5 text-sm text-white">
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
      </div>
    );
  }

  const showThinking = message.streaming && message.text.length === 0;

  return (
    <div className="mr-auto max-w-[92%]">
      <div className="rounded-panel border border-border bg-panel px-4 py-3">
        {showThinking ? (
          <p className="text-sm text-muted">{t.ask.thinking}</p>
        ) : (
          <p
            aria-live={message.streaming ? "polite" : undefined}
            aria-label={message.streaming ? t.a11y.liveAnswer : undefined}
            className={cn(
              "whitespace-pre-wrap break-words text-sm leading-relaxed text-fg",
              message.streaming && "mios-caret",
            )}
          >
            {message.text}
          </p>
        )}

        {message.citations.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
            <span className="mr-1 text-xs text-muted">{t.ask.sources(message.citations.length)}</span>
            {message.citations.map((citation, index) => (
              <CitationChip
                key={`${citation.document_id}-${citation.chunk_index}`}
                index={index}
                citation={citation}
                onSelect={onOpenSource}
              />
            ))}
          </div>
        ) : null}

        {!message.streaming && message.text.length > 0 && message.citations.length === 0 ? (
          <p className="mt-3 border-t border-border pt-3 text-xs text-warn">{t.ask.noSources}</p>
        ) : null}
      </div>

      {!message.streaming && message.text.length > 0 ? (
        <div className="mt-1.5 flex items-center gap-2">
          {message.provider ? (
            <Badge tone="neutral" className="text-[11px]">
              {t.ask.answeredBy(message.provider)}
            </Badge>
          ) : null}
          {message.feedback ? (
            <span className="text-xs text-muted">{t.ask.feedbackThanks}</span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onFeedback("up")}
                aria-label={t.ask.helpful}
                className="rounded p-1 text-muted hover:text-ok"
              >
                <ThumbsUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onFeedback("down")}
                aria-label={t.ask.notHelpful}
                className="rounded p-1 text-muted hover:text-danger"
              >
                <ThumbsDown className="size-3.5" />
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function EmptyChat({
  hasDocuments,
  onPick,
}: {
  hasDocuments: boolean;
  onPick: (sample: string) => void;
}) {
  const { t } = useT();
  return (
    <Panel className="border-dashed bg-transparent">
      <h2 className="text-base font-semibold text-fg">{t.ask.emptyTitle}</h2>
      <p className="mt-1 text-sm text-muted">
        {hasDocuments ? t.ask.emptyBody : t.knowledge.emptyBody}
      </p>
      {hasDocuments ? (
        <>
          <p className="mt-5 text-xs uppercase tracking-wide text-muted">{t.ask.trySomething}</p>
          <ul className="mt-2 grid gap-2">
            {t.ask.samples.map((sample) => (
              <li key={sample}>
                <button
                  type="button"
                  onClick={() => onPick(sample)}
                  className="w-full rounded-md border border-border px-3 py-2 text-left text-sm text-muted transition-colors hover:border-accent hover:text-fg"
                >
                  {sample}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Panel>
  );
}
