// Terminal-based instruction display — shows step instructions in the terminal
// Updates in-place using ANSI escape codes. Zero additional RAM (no extra browser).
// Human positions terminal next to browser window during recording.

import type { TutorialScript } from "../script/script-types.js";

const BLUE = "\x1b[38;5;75m";
const GREEN = "\x1b[38;5;114m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const CLEAR_LINE = "\x1b[2K";
const MOVE_UP = "\x1b[A";

/** Number of terminal lines the instruction box occupies */
const BOX_LINES = 8;

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
  let linesDrawn = 0;

  function draw(stepIdx: number) {
    // Erase previous box
    if (linesDrawn > 0) {
      for (let i = 0; i < linesDrawn; i++) {
        process.stderr.write(`${MOVE_UP}${CLEAR_LINE}\r`);
      }
    }

    const lines: string[] = [];
    lines.push(`${DIM}${"─".repeat(50)}${RESET}`);

    if (stepIdx >= steps.length) {
      lines.push(`  ${GREEN}${BOLD}All steps complete!${RESET}`);
      lines.push(`  ${DIM}Press Esc in browser to stop recording${RESET}`);
    } else {
      const step = steps[stepIdx]!;
      lines.push(`  ${BLUE}${BOLD}Step ${step.step}/${steps.length}${RESET}  ${DIM}~${step.expectedDurationSec}s${RESET}`);
      lines.push(`  ${BOLD}${step.instruction}${RESET}`);
      const next = stepIdx + 1 < steps.length ? steps[stepIdx + 1] : null;
      if (next) {
        lines.push(`  ${DIM}Next: ${next.instruction}${RESET}`);
      }
    }

    lines.push(`  ${DIM}[Space] next step  [Esc] stop${RESET}`);
    lines.push(`${DIM}${"─".repeat(50)}${RESET}`);

    const output = lines.join("\n") + "\n";
    process.stderr.write(output);
    linesDrawn = lines.length;
  }

  // Draw initial state
  draw(0);

  return {
    updateStep(stepIdx: number) {
      if (stepIdx === lastStep) return;
      lastStep = stepIdx;
      draw(stepIdx);
    },
    clear() {
      if (linesDrawn > 0) {
        for (let i = 0; i < linesDrawn; i++) {
          process.stderr.write(`${MOVE_UP}${CLEAR_LINE}\r`);
        }
        linesDrawn = 0;
      }
    },
  };
}
