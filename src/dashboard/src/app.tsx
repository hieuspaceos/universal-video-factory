// App — two-column layout: sidebar (job list) + main (detail or form)

import { useState, useEffect, useCallback } from "react";
import { listJobs } from "./api-client.js";
import { useWebSocket } from "./use-websocket.js";
import { JobList } from "./components/job-list.js";
import { JobDetail } from "./components/job-detail.js";
import { JobForm } from "./components/job-form.js";
import type { Job, WsEvent } from "./types.js";

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

  const { isConnected } = useWebSocket(handleWsEvent);

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
    <div className="layout">
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
  );
}
