// Log panel — fetches initial logs then streams new lines via WS job:log events

import { useState, useEffect, useRef, useCallback } from "react";
import { getJobLogs } from "../api-client.js";
import { useWebSocket } from "../use-websocket.js";
import type { WsEvent } from "../types.js";

interface Props {
  jobId: string;
  /** Whether the job is still running (controls live-tail behavior) */
  isLive: boolean;
}

export function JobLogsPanel({ jobId, isLive }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(true);

  // Load existing log lines on mount
  useEffect(() => {
    setLoading(true);
    setError(null);
    getJobLogs(jobId)
      .then((fetched) => setLines(fetched))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load logs");
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  // Stream new log lines via WebSocket while job is live
  const handleWsEvent = useCallback(
    (event: WsEvent) => {
      if (!isLive) return;
      if (event.type !== "job:log") return;
      if (event.jobId !== jobId) return;
      setLines((prev) => [...prev, event.line]);
    },
    [jobId, isLive]
  );

  useWebSocket(isLive ? handleWsEvent : undefined);

  // Auto-scroll to bottom when new lines arrive (only if user hasn't scrolled up)
  useEffect(() => {
    if (autoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines]);

  function handleScroll(e: React.UIEvent<HTMLPreElement>) {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    autoScrollRef.current = atBottom;
  }

  if (loading) {
    return <div className="logs-loading">Loading logs…</div>;
  }

  if (error) {
    return <div className="error-box">{error}</div>;
  }

  if (lines.length === 0) {
    return (
      <div className="logs-empty">
        {isLive ? "Waiting for log output…" : "No log output recorded."}
      </div>
    );
  }

  return (
    <pre className="logs-viewer" onScroll={handleScroll}>
      {lines.join("\n")}
      <div ref={bottomRef} />
    </pre>
  );
}
