// Status badge — colored dot + label for each job status

import type { JobStatus } from "../types.js";

const LABELS: Record<JobStatus, string> = {
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

interface Props {
  status: JobStatus;
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {LABELS[status]}
    </span>
  );
}
