"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/fetcher";
import { useT } from "@/lib/i18n/useT";
import { formatBytes } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

interface UploadItem {
  id: string;
  file: File;
  percent: number;
  state: "uploading" | "registering" | "done" | "error";
  message?: string;
}

const ACCEPT = ".pdf,.txt,.md,.docx,.xlsx,.xlsm,.csv,.png,.jpg,.jpeg";

/**
 * Direct-to-Storage uploader.
 *
 * Uses XMLHttpRequest rather than fetch because only XHR exposes upload progress events,
 * and a 60 MB scanned audit binder over factory wifi needs a real progress bar.
 */
export function Uploader() {
  const { t, lang } = useT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);

  const patch = useCallback((id: string, update: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...update } : item)),
    );
  }, []);

  const uploadOne = useCallback(
    async (file: File) => {
      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((current) => [...current, { id, file, percent: 0, state: "uploading" }]);

      try {
        const signRes = await fetch("/api/documents/sign-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          }),
        });

        if (!signRes.ok) {
          const body = await signRes.json().catch(() => ({}));
          patch(id, { state: "error", message: body.detail ?? t.common.unknownError });
          return;
        }

        const { signedUrl, path } = (await signRes.json()) as {
          signedUrl: string;
          path: string;
        };

        await putWithProgress(signedUrl, file, (percent) => patch(id, { percent }));

        patch(id, { state: "registering", percent: 100 });

        const registerRes = await fetch("/api/documents/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storage_path: path, filename: file.name }),
        });
        if (!registerRes.ok) {
          const body = await registerRes.json().catch(() => ({}));
          throw new ApiError(
            typeof body.detail === "string" ? body.detail : `Registration failed (${registerRes.status})`,
            registerRes.status,
          );
        }

        const document = (await registerRes.json()) as { id: string };
        const processRes = await fetch(`/api/documents/${document.id}/process`, { method: "POST" });
        if (!processRes.ok) {
          const body = await processRes.json().catch(() => ({}));
          throw new ApiError(
            typeof body.detail === "string" ? body.detail : `Processing failed (${processRes.status})`,
            processRes.status,
          );
        }

        patch(id, { state: "done" });
        router.refresh();
      } catch (cause) {
        patch(id, {
          state: "error",
          message: cause instanceof ApiError ? cause.localized(t) : t.common.unknownError,
        });
        toast.error(cause instanceof ApiError ? cause.localized(t) : t.common.unknownError);
      }
    },
    [patch, router, t],
  );

  const onFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      for (const file of Array.from(files)) void uploadOne(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [uploadOne],
  );

  return (
    <div className="grid gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onFiles(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-panel border border-dashed px-4 py-8 text-center transition-colors",
          dragging ? "border-accent bg-accent/5" : "border-border",
        )}
      >
        <UploadCloud className="mx-auto size-6 text-muted" />
        <p className="mt-2 text-sm text-fg">{dragging ? t.knowledge.dropHere : t.knowledge.dragOrClick}</p>
        <p className="mt-1 text-xs text-muted">{t.knowledge.uploadHint}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => onFiles(event.target.files)}
        />
        <Button type="button" className="mt-4" onClick={() => inputRef.current?.click()}>
          {t.knowledge.upload}
        </Button>
      </div>

      {items.length > 0 ? (
        <ul className="grid gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-border bg-panel px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-fg" title={item.file.name}>
                  {item.file.name}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {formatBytes(item.file.size, lang)}
                </span>
                {item.state === "done" || item.state === "error" ? (
                  <button
                    type="button"
                    aria-label={t.common.close}
                    onClick={() =>
                      setItems((current) => current.filter((entry) => entry.id !== item.id))
                    }
                    className="shrink-0 text-muted hover:text-fg"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>

              {item.state === "uploading" ? (
                <div className="mt-2">
                  <Progress
                    value={item.percent}
                    label={t.a11y.uploadProgress(item.file.name, item.percent)}
                  />
                </div>
              ) : null}

              <p
                className={cn(
                  "mt-1 text-xs",
                  item.state === "error" ? "text-danger" : "text-muted",
                )}
              >
                {item.state === "uploading"
                  ? `${t.knowledge.uploading} ${item.percent}%`
                  : item.state === "registering"
                    ? t.knowledge.processing
                    : item.state === "done"
                      ? t.knowledge.processingNote
                      : item.message}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** PUT with upload progress. `fetch` cannot report request-body progress. */
function putWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ApiError(`Upload failed (${xhr.status})`, xhr.status));
    xhr.onerror = () => reject(new ApiError("Upload failed", 0));
    xhr.onabort = () => reject(new ApiError("Upload cancelled", 0));
    xhr.send(file);
  });
}
