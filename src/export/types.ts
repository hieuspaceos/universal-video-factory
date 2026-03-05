// Export module types

export interface ExportOptions {
  /** Target video bitrate (default: "8M") */
  videoBitrate?: string;
  /** Audio bitrate (default: "192k") */
  audioBitrate?: string;
  /** Progress callback — receives frame number parsed from FFmpeg stderr */
  onProgress?: (frame: number) => void;
}

export interface ExportResult {
  outputPath: string;
  durationMs: number;
  /** Encoder actually used (hevc_videotoolbox | libx265 | libx264) */
  encoder: string;
}

export interface ConvertResult {
  outputPath: string;
  durationMs: number;
}
