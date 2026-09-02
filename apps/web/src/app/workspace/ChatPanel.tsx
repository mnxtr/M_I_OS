"use client";

import { FormEvent, RefObject } from "react";

import { ChatMetadata, Citation, DocumentRecord } from "@/lib/api";
import { Lang, t } from "@/lib/i18n";

import { WorkspaceView } from "./DashboardOverview";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  metadata?: ChatMetadata;
  warnings?: string[];
  streaming?: boolean;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  question: string;
  busy: boolean;
  error: string;
  documents: DocumentRecord[];
  lang: Lang;
  messageEndRef: RefObject<HTMLDivElement | null>;
  onQuestionChange: (question: string) => void;
  onAsk: (event: FormEvent<HTMLFormElement>) => void;
  onPrompt: (prompt: string) => void;
  onClear: () => void;
  onNavigate: (view: WorkspaceView) => void;
}

export default function ChatPanel({
  messages,
  question,
  busy,
  error,
  documents,
  lang,
  messageEndRef,
  onQuestionChange,
  onAsk,
  onPrompt,
  onClear,
  onNavigate,
}: ChatPanelProps) {
  const tr = t(lang);
  const prompts = [tr.promptOne, tr.promptTwo, tr.promptThree];

  return (
    <div className="workspace-view chat-view">
      <section className="view-intro view-intro-with-action">
        <div>
          <p className="eyebrow">{tr.chatEyebrow}</p>
          <h1>{tr.chatTitle}</h1>
          <p>{tr.chatIntro}</p>
        </div>
        {messages.length > 0 ? (
          <button className="btn btn-quiet" onClick={onClear}>
            {tr.clearConversation}
          </button>
        ) : null}
      </section>

      <div className="chat-layout">
        <aside className="chat-context-card">
          <div className="section-heading section-heading-inline">
            <div>
              <p className="eyebrow">{tr.knowledgeBase}</p>
              <h2>{tr.sourceLibrary}</h2>
            </div>
            <span className="count-badge">{documents.length}</span>
          </div>

          {documents.length > 0 ? (
            <div className="chat-source-list">
              {documents.slice(0, 6).map((document) => (
                <button
                  className="chat-source"
                  key={document.id}
                  onClick={() => onNavigate("knowledge")}
                >
                  <span className="file-type">{document.doc_type.slice(0, 3).toUpperCase()}</span>
                  <span>
                    <strong>{document.filename}</strong>
                    <small>{document.status}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="chat-context-empty">
              <p>{tr.noDocsYet}</p>
              <button className="text-button" onClick={() => onNavigate("knowledge")}>
                {tr.addDocument}
              </button>
            </div>
          )}
        </aside>

        <section className="conversation-card">
          <div className="conversation-scroll" aria-live="polite">
            {messages.length === 0 ? (
              <div className="conversation-empty">
                <span className="assistant-label">MIOS</span>
                <h2>{tr.suggestedQuestions}</h2>
                <p>{tr.tryPrompt}</p>
                <div className="prompt-list">
                  {prompts.map((prompt, index) => (
                    <button key={prompt} onClick={() => onPrompt(prompt)}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="message-list">
                {messages.map((message, index) => (
                  <article className={`message message-${message.role}`} key={`${message.role}-${index}`}>
                    <span className="message-author">
                      {message.role === "assistant" ? "MIOS" : lang === "bn" ? "আপনি" : "You"}
                    </span>
                    <div className="message-bubble">
                      {message.text || (message.streaming ? tr.thinking : "")}
                      {message.streaming && message.text ? <span className="stream-caret" /> : null}
                    </div>
                    {message.metadata ? (
                      <div className="brain-metadata" aria-label={tr.answerMetadata}>
                        <span>
                          {message.metadata.provider} · {message.metadata.model}
                        </span>
                        <span>
                          {tr.confidence}: {Math.round(message.metadata.confidence * 100)}%
                        </span>
                        <span>
                          {tr.evidenceCoverage}: {Math.round(message.metadata.evidence_coverage * 100)}%
                        </span>
                        <span title={message.metadata.trace_id}>
                          {tr.trace}: {message.metadata.trace_id.slice(0, 8)}
                        </span>
                      </div>
                    ) : null}
                    {message.warnings && message.warnings.length > 0 ? (
                      <div className="brain-warning" role="status">
                        <strong>{tr.limitations}</strong>
                        <ul>
                          {message.warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {message.metadata?.suggested_actions.length ? (
                      <p className="brain-next-step">
                        <strong>{tr.suggestedAction}:</strong>{" "}
                        {message.metadata.suggested_actions[0]}
                      </p>
                    ) : null}
                    {message.citations && message.citations.length > 0 ? (
                      <div className="citation-list">
                        <p>{tr.sources(message.citations.length)}</p>
                        {message.citations.map((citation, citationIndex) => (
                          <article className="citation-card" key={`${citation.document_id}-${citationIndex}`}>
                            <span>{String(citationIndex + 1).padStart(2, "0")}</span>
                            <div>
                              <strong>{citation.document_name}</strong>
                              <small>
                                p.{citation.page} · {citation.snippet}
                              </small>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
                <div ref={messageEndRef} />
              </div>
            )}
          </div>

          {error ? (
            <p className="error-text conversation-error" role="alert">
              {error}
            </p>
          ) : null}

          <form className="composer" onSubmit={onAsk}>
            <label htmlFor="factory-question" className="sr-only">
              {tr.askPlaceholder}
            </label>
            <textarea
              id="factory-question"
              className="textarea"
              rows={2}
              placeholder={tr.askPlaceholder}
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button className="btn btn-primary" disabled={busy || !question.trim()}>
              {busy ? tr.pleaseWait : tr.ask}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
