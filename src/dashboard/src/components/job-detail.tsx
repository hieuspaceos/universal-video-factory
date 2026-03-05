// Job detail — config summary, pipeline progress, video preview, cancel button

import { useState } from "react";
import { cancelJob } from "../api-client.js";
import { StatusBadge } from "./status-badge.js";
import { PipelineProgress } from "./pipeline-progress.js";
import { VideoPreview } from "./video-preview.js";
import type { Job } from "../types.js";

interface Props {
  job: Job;
  onCancelled: (id: string) => void;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function JobDetail({ job, onCancelled }: Props) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const canCancel = job.status === "queued" || job.status === "running";

  async function handleCancel() {
    if (!canCancel) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelJob(job.id);
      onCancelled(job.id);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="job-detail">
      <div className="detail-header">
        <div>
          <div className="detail-title">{job.config.feature}</div>
          <div className="detail-id">{job.id}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <StatusBadge status={job.status} />
          {canCancel && (
            <button
              className="btn-danger"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling…" : "Cancel"}
            </button>
          )}
        </div>
      </div>

      {cancelError && (
        <div className="error-box" style={{ marginBottom: "12px" }}>
          {cancelError}
        </div>
      )}

      {/* Config summary */}
      <div className="config-grid">
        <span className="config-label">URL</span>
        <span className="config-value">
          <a href={job.config.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
            {job.config.url}
          </a>
        </span>
        <span className="config-label">Feature</span>
        <span className="config-value">{job.config.feature}</span>
        <span className="config-label">Language</span>
        <span className="config-value">{job.config.lang}</span>
        {job.config.brand && (
          <>
            <span className="config-label">Brand</span>
            <span className="config-value">{job.config.brand}</span>
          </>
        )}
        <span className="config-label">Created</span>
        <span className="config-value">{formatDate(job.createdAt)}</span>
        {job.startedAt && (
          <>
            <span className="config-label">Started</span>
            <span className="config-value">{formatDate(job.startedAt)}</span>
          </>
        )}
        {job.completedAt && (
          <>
            <span className="config-label">Completed</span>
            <span className="config-value">{formatDate(job.completedAt)}</span>
          </>
        )}
      </div>

      {/* Error box */}
      {job.status === "failed" && job.error && (
        <div className="error-box">
          <strong>Error:</strong> {job.error}
        </div>
      )}

      {/* Pipeline progress — shown while running or after completion */}
      {(job.status === "running" || job.status === "completed") && (
        <PipelineProgress progress={job.progress} status={job.status} />
      )}

      {/* Video preview for completed jobs */}
      {job.status === "completed" && (
        <VideoPreview jobId={job.id} outputPath={job.outputPath} />
      )}
    </div>
  );
}
