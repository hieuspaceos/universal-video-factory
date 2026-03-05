// App — two-column layout: sidebar (job list) + main (detail or form)

import { useState, useEffect, useCallback, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { listJobs } from "./api-client.js";
import { useWebSocket } from "./use-websocket.js";
import { JobList } from "./components/job-list.js";
import { JobDetail } from "./components/job-detail.js";
import { JobForm } from "./components/job-form.js";
import type { Job, WsEvent } from "./types.js";

// --- Error Boundary ---

interface ErrorBoundaryState { hasError: boolean; message: string }

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): ErrorBoundaryState {
    const message = err instanceof Error ? err.message : String(err);
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown, info: ErrorInfo) {
    console.error("[ErrorBoundary]", err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-icon">⚠</div>
          <p className="error-boundary-title">Something went wrong</p>
          <p className="error-boundary-msg">{this.state.message}</p>
          <button
            className="btn-primary"
            onClick={() => this.setState({ hasError: false, message: "" })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Connection Banner ---

function ConnectionBanner({ isConnected, wasDisconnected }: { isConnected: boolean; wasDisconnected: boolean }) {
  if (isConnected || !wasDisconnected) return null;
  return (
    <div className="connection-banner">
      Connection lost — reconnecting…
    </div>
  );
}

// --- Main App ---

export function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch full job list
  const fetchJobs = useCallback(async () => {
    try {
      const data = await listJobs();
      setJobs(data);
      // Auto-select running job if nothing selected
      setSelectedId((prev) => {
        if (prev) return prev;
        const running = data.find((j) => j.status === "running");
        return running?.id ?? null;
      });
    } catch {
      // Silent — will retry on next WS event
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  // Handle incoming WS events — update local state + refetch when needed
  const handleWsEvent = useCallback(
    (event: WsEvent) => {
      // Skip log events — handled inside JobDetail
      if (event.type === "job:log") return;

      const updated = event.job;
      setJobs((prev) => {
        const idx = prev.findIndex((j) => j.id === updated.id);
        if (idx === -1) return [updated, ...prev];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
      // Auto-select newly created job
      if (event.type === "job:created") {
        setSelectedId(updated.id);
        setShowForm(false);
      }
    },
    []
  );

  const { isConnected, wasDisconnected } = useWebSocket(handleWsEvent);

  const selectedJob = jobs.find((j) => j.id === selectedId) ?? null;
  const hasRunningJob = jobs.some((j) => j.status === "running");

  function handleNewJob() {
    setShowForm(true);
    setSelectedId(null);
  }

  function handleJobCreated(job: Job) {
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.id === job.id);
      if (idx === -1) return [job, ...prev];
      const next = [...prev];
      next[idx] = job;
      return next;
    });
    setSelectedId(job.id);
    setShowForm(false);
  }

  function handleJobCancelled(id: string) {
    void fetchJobs();
    if (selectedId === id) setSelectedId(null);
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    setShowForm(false);
  }

  return (
    <ErrorBoundary>
      <div className="layout">
        {/* Connection lost banner */}
        <ConnectionBanner isConnected={isConnected} wasDisconnected={wasDisconnected} />

        {/* Header */}
        <header className="header">
          <span className="header-title">Video Factory</span>
          <div className="header-right">
            <div
              className={`ws-indicator${isConnected ? " connected" : ""}`}
              title={isConnected ? "Live" : "Reconnecting…"}
            />
            <button className="btn-primary" onClick={handleNewJob}>
              + New Job
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="body">
          {/* Sidebar */}
          <aside className="sidebar">
            {loading ? (
              <div style={{ padding: "16px", color: "var(--text-muted)", fontSize: "12px" }}>
                Loading…
              </div>
            ) : (
              <JobList
                jobs={jobs}
                selectedId={selectedId}
                onSelect={handleSelect}
              />
            )}
          </aside>

          {/* Main content */}
          <main className="main">
            {showForm ? (
              <JobForm
                onJobCreated={handleJobCreated}
                hasRunningJob={hasRunningJob}
              />
            ) : selectedJob ? (
              <JobDetail
                key={selectedJob.id}
                job={selectedJob}
                onCancelled={handleJobCancelled}
              />
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🎬</div>
                <p>Select a job from the sidebar</p>
                <p>or click <strong>+ New Job</strong> to get started.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
