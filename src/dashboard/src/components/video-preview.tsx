// Video preview — HTML5 player + download button for completed jobs

import { getOutputUrl } from "../api-client.js";

interface Props {
  jobId: string;
  outputPath: string | null;
}

export function VideoPreview({ jobId, outputPath }: Props) {
  const url = getOutputUrl(jobId);
  const filename = outputPath
    ? outputPath.split("/").pop() ?? "video.mp4"
    : "video.mp4";

  return (
    <div className="video-preview">
      <video controls preload="metadata" key={jobId}>
        <source src={url} type="video/mp4" />
        Your browser does not support HTML5 video.
      </video>
      <div className="video-actions">
        <a href={url} download={filename} className="btn-primary" style={{ textDecoration: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "13px" }}>
          Download
        </a>
        {outputPath && (
          <span style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center", wordBreak: "break-all" }}>
            {outputPath}
          </span>
        )}
      </div>
    </div>
  );
}
