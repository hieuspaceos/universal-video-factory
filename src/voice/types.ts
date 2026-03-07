// Voice pipeline types

export interface SceneMarker {
  /** e.g. "SCENE:01" */
  id: string;
  /** Word index in clean text after which this marker appears */
  afterWordIdx: number;
}

export interface PreprocessedScript {
  /** Script text with [SCENE:XX] markers removed */
  cleanText: string;
  /** Ordered list of scene markers with their positions */
  sceneMarkers: SceneMarker[];
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
  /** Speaking speed multiplier (0.7–1.3). Lower = slower narration. */
  speed?: number;
}

export interface TTSOptions {
  modelId?: string;
  voiceSettings?: VoiceSettings;
  outputFormat?: string;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface SceneBoundary {
  id: string;
  start_word_idx: number;
  end_word_idx: number;
  start_time: number;
  end_time: number;
}

export interface WordsTimestamps {
  words: WordTimestamp[];
  scenes: SceneBoundary[];
  total_duration: number;
}

/** Per-scene audio file produced by splitting the single TTS output */
export interface SceneAudioFile {
  /** Scene ID, e.g. "SCENE:01" */
  sceneId: string;
  /** Absolute path to the split audio file */
  audioPath: string;
  /** Duration of this scene's audio in seconds */
  durationSec: number;
  /** Start time in the original single audio (seconds) */
  originalStartSec: number;
  /** End time in the original single audio (seconds) */
  originalEndSec: number;
}