import { Config } from "@remotion/cli/config";

// Remotion configuration for video-factory
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setPort(3333);

// Concurrency: use half available cores to avoid memory pressure
Config.setConcurrency(4);
