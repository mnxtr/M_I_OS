"use client";

import { DragEvent, RefObject, useState } from "react";

import { DocumentRecord } from "@/lib/api";
import { Lang, t } from "@/lib/i18n";

import { StatusBadge } from "./DashboardOverview";

interface KnowledgePanelProps {
  documents: DocumentRecord[];
  fileInput: RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  lang: Lang;
  onUpload: (file: File) => void;
}

export default function KnowledgePanel({
  documents,
  fileInput,
  isUploading,
  lang,
  onUpload,
}: KnowledgePanelProps) {
  const tr = t(lang);
  const [isDragging, setIsDragging] = useState(false);

  function acceptDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onUpload(file);
  }

  return (
    <div className="workspace-view knowledge-view">
      <section className="view-intro">
        <div>
          <p className="eyebrow">{tr.knowledgeBase}</p>
          <h1>{tr.sourceLibrary}</h1>
          <p>{tr.connectCopy}</p>
        </div>
        <span className="count-badge">{tr.sourceCount(documents.length)}</span>
      </section>

      <div
        className={isDragging ? "upload-zone is-dragging" : "upload-zone"}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={acceptDrop}
      >
        <span className="upload-index" aria-hidden="true">
          ADD
        </span>
        <div>
          <h2>{tr.dropFiles}</h2>
          <p>{tr.supportedFiles}</p>
        </div>
        <button
          className="btn btn-primary"
          disabled={isUploading}
          onClick={() => fileInput.current?.click()}
        >
          {isUploading ? tr.pleaseWait : tr.uploadDoc}
        </button>
      </div>

      <section className="section-card source-library-card">
        <div className="section-heading section-heading-inline">
          <div>
            <p className="eyebrow">{tr.knowledgeBase}</p>
            <h2>{tr.sourceLibrary}</h2>
          </div>
          <span className="count-badge">{documents.length}</span>
        </div>

        {documents.length > 0 ? (
          <div className="source-list">
            {documents.map((document) => (
              <article className="source-row source-row-large" key={document.id}>
                <span className="file-type">{document.doc_type.slice(0, 3).toUpperCase()}</span>
                <div className="source-row-copy">
                  <strong>{document.filename}</strong>
                  <span>
                    {document.department || tr.knowledgeBase}
                    {document.page_count > 0 ? ` · ${document.page_count} ${tr.pages}` : ""}
                  </span>
                  {document.error ? <span className="error-text">{document.error}</span> : null}
                </div>
                <time dateTime={document.created_at}>
                  {new Date(document.created_at).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </time>
                <StatusBadge status={document.status} lang={lang} />
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-index">00</span>
            <h3>{tr.noKnowledgeTitle}</h3>
            <p>{tr.noDocsYet}</p>
          </div>
        )}
      </section>
    </div>
  );
}
