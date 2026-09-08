/**
 * Server-sent event reader.
 *
 * Replaces the two near-identical hand-rolled parsers in the legacy SPA and fixes the
 * bug both shared: they split the buffer on "\n" and dropped any frame whose `data: `
 * prefix straddled a chunk boundary, and could not handle a multi-line frame. This
 * splits on the actual SSE event delimiter ("\n\n") instead.
 */
export async function* sseFrames<T>(res: Response): AsyncGenerator<T> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let boundary = buf.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buf.slice(0, boundary);
        buf = buf.slice(boundary + 2);
        const parsed = parseFrame<T>(frame);
        if (parsed !== undefined) yield parsed;
        boundary = buf.indexOf("\n\n");
      }
    }
    // A well-behaved producer ends with "\n\n", but do not lose a final unterminated frame.
    const tail = parseFrame<T>(buf);
    if (tail !== undefined) yield tail;
  } finally {
    reader.releaseLock();
  }
}

function parseFrame<T>(frame: string): T | undefined {
  const data = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  if (!data) return undefined;
  try {
    return JSON.parse(data) as T;
  } catch {
    // Malformed frames are skipped rather than aborting the stream.
    return undefined;
  }
}
