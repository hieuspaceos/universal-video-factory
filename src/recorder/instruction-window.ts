// Terminal-based instruction display — shows step instructions in a separate terminal
// Writes to a log file that can be tailed from another terminal window.
// Also writes to stderr for inline display. Zero additional RAM.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import type { TutorialScript } from "../script/script-types.js";

/** Path where instructions are written for external terminal to tail */
export const INSTRUCTION_LOG_PATH = path.join(os.tmpdir(), "vf-instructions.log");

export interface InstructionDisplay {
  /** Update the displayed step */
  updateStep(stepIdx: number): void;
  /** Clear the display on exit */
  clear(): void;
}

/** Create a terminal-based instruction display (zero RAM overhead) */
export function createInstructionDisplay(script: TutorialScript): InstructionDisplay {
  const steps = script.steps;
  let lastStep = -1;

  // Initialize log file
  fs.writeFileSync(INSTRUCTION_LOG_PATH, "", "utf-8");

  function writeToLog(stepIdx: number) {
    const lines: string[] = [];
    lines.push("\x1b[2J\x1b[H"); // Clear screen + move cursor to top
    lines.push("══════════════════════════════════════════════════");
    lines.push("            RECORDING INSTRUCTIONS");
    lines.push("══════════════════════════════════════════════════");
    lines.push("");

    if (stepIdx >= steps.length) {
      lines.push("  \x1b[38;5;114m\x1b[1m✓ All steps complete!\x1b[0m");
      lines.push("");
      lines.push("  Press \x1b[1mEsc\x1b[0m in browser to stop recording.");
    } else {
      const step = steps[stepIdx]!;
      lines.push(`  \x1b[38;5;75m\x1b[1mStep ${step.step} / ${steps.length}\x1b[0m  \x1b[2m(~${step.expectedDurationSec}s)\x1b[0m`);
      lines.push("");
      lines.push(`  \x1b[1m→ ${step.instruction}\x1b[0m`);
      lines.push("");
      lines.push(`  \x1b[2m"${step.narration}"\x1b[0m`);

      const next = stepIdx + 1 < steps.length ? steps[stepIdx + 1] : null;
      if (next) {
        lines.push("");
        lines.push(`  \x1b[2mNext: ${next.instruction}\x1b[0m`);
      }
    }

    lines.push("");
    lines.push("──────────────────────────────────────────────────");
    lines.push("  \x1b[2m[Space] next step    [Esc] stop recording\x1b[0m");
    lines.push("──────────────────────────────────────────────────");

    fs.writeFileSync(INSTRUCTION_LOG_PATH, lines.join("\n") + "\n", "utf-8");
  }

  // Write initial state
  writeToLog(0);

  return {
    updateStep(stepIdx: number) {
      if (stepIdx === lastStep) return;
      lastStep = stepIdx;
      writeToLog(stepIdx);
    },
    clear() {
      try { fs.unlinkSync(INSTRUCTION_LOG_PATH); } catch { /* ok */ }
    },
  };
}
