// Pipeline progress — A→E phase blocks with active/done animation

import { PIPELINE_PHASES } from "../types.js";
import type { JobProgress, PhaseId } from "../types.js";

interface Props {
  progress: JobProgress | null;
  status: string;
}

function getPhaseState(
  phaseId: string,
  currentPhase: string | undefined,
  isDone: boolean
): "pending" | "active" | "done" {
  if (!currentPhase) return "pending";
  const phaseIds = PIPELINE_PHASES.map((p) => p.id);
  const currentIdx = phaseIds.indexOf(currentPhase as PhaseId);
  const thisIdx = phaseIds.indexOf(phaseId as PhaseId);
  if (thisIdx < 0) return "pending";
  if (isDone || thisIdx < currentIdx) return "done";
  if (thisIdx === currentIdx) return "active";
  return "pending";
}

export function PipelineProgress({ progress, status }: Props) {
  const isDone = status === "completed";
  const currentPhase = progress?.phase;

  return (
    <div className="pipeline">
      <div className="pipeline-label">Pipeline Phases</div>

      <div className="pipeline-phases">
        {PIPELINE_PHASES.map(({ id, label }) => {
          const state = getPhaseState(id, currentPhase, isDone);
          return (
            <div key={id} className={`phase-block phase-${state}`}>
              <div className="phase-block-id">{id}</div>
              <div className="phase-block-name">{label}</div>
            </div>
          );
        })}
      </div>

      <div className="progress-bar-wrap">
        <div
          className="progress-bar-fill"
          style={{ width: `${isDone ? 100 : (progress?.percent ?? 0)}%` }}
        />
      </div>

      {progress && !isDone && (
        <div className="progress-phase-name">
          Phase {progress.phase}: {progress.phaseName} —{" "}
          {Math.round(progress.percent)}%
        </div>
      )}
      {isDone && (
        <div className="progress-phase-name" style={{ color: "var(--green)" }}>
          All phases complete
        </div>
      )}
    </div>
  );
}
