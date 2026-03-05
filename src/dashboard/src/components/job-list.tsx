// Job list — sidebar queue with status badges, sorted newest first

import { StatusBadge } from "./status-badge.js";
import type { Job } from "../types.js";

interface Props {
  jobs: Job[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function EmptyJobList() {
  return (
    <div className="empty-job-list">
      <div className="empty-job-list-icon">📭</div>
      <p className="empty-job-list-title">No jobs yet</p>
      <p className="empty-job-list-hint">
        Click <strong>+ New Job</strong> in the header to submit your first video job.
      </p>
    </div>
  );
}

export function JobList({ jobs, selectedId, onSelect }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="job-list">
        <EmptyJobList />
      </div>
    );
  }

  // Newest first
  const sorted = [...jobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="job-list">
      {sorted.map((job) => (
        <div
          key={job.id}
          className={`job-item${selectedId === job.id ? " selected" : ""}`}
          onClick={() => onSelect(job.id)}
        >
          <div className="job-item-id">{job.id.slice(0, 12)}…</div>
          <div className="job-item-feature">{job.config.feature}</div>
          <div className="job-item-meta">
            <StatusBadge status={job.status} />
            <span className="job-item-time">{relativeTime(job.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
