// Unit tests for src/orchestrator/error-handler.ts — classifyError

import { describe, it, expect } from "vitest";
import { classifyError } from "../../src/orchestrator/error-handler.js";

describe("classifyError", () => {
  describe("retryable errors", () => {
    const retryableCases = [
      "network error",
      "request timeout after 30s",
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "rate limit exceeded",
      "HTTP 429 Too Many Requests",
      "HTTP 503 Service Unavailable",
      "HTTP 502 Bad Gateway",
      "fetch failed",
    ];

    for (const msg of retryableCases) {
      it(`classifies "${msg}" as retryable`, () => {
        const result = classifyError(new Error(msg));
        expect(result.category).toBe("retryable");
      });
    }
  });

  describe("fatal errors", () => {
    it("classifies API_KEY not set as fatal", () => {
      const result = classifyError(new Error("ANTHROPIC_API_KEY not set"));
      expect(result.category).toBe("fatal");
      expect(result.userMessage).toContain("ANTHROPIC_API_KEY");
    });

    it("classifies credit balance error as fatal", () => {
      const result = classifyError(new Error("Insufficient credit balance"));
      expect(result.category).toBe("fatal");
      expect(result.suggestion).toContain("billing");
    });

    it("classifies billing error as fatal", () => {
      const result = classifyError(new Error("billing account suspended"));
      expect(result.category).toBe("fatal");
    });

    it("classifies ENOENT as fatal", () => {
      const result = classifyError(new Error("ENOENT: no such file"));
      expect(result.category).toBe("fatal");
      expect(result.userMessage).toContain("file not found");
    });

    it("classifies ffmpeg not found as fatal", () => {
      const result = classifyError(new Error("ffmpeg not found"));
      expect(result.category).toBe("fatal");
      expect(result.suggestion).toContain("brew install ffmpeg");
    });

    it("classifies invalid URL as fatal", () => {
      const result = classifyError(new Error("invalid url provided"));
      expect(result.category).toBe("fatal");
    });
  });

  describe("unknown errors", () => {
    it("defaults unknown errors to fatal", () => {
      const result = classifyError(new Error("something completely unexpected"));
      expect(result.category).toBe("fatal");
      expect(result.userMessage).toContain("unexpected");
    });

    it("preserves original error reference", () => {
      const original = new Error("test error");
      const result = classifyError(original);
      expect(result.originalError).toBe(original);
    });
  });

  describe("suggestions", () => {
    it("suggests billing page for credit errors", () => {
      const result = classifyError(new Error("credit balance too low"));
      expect(result.suggestion).toContain("console.anthropic.com");
    });

    it("suggests .env.local for ELEVENLABS_API_KEY", () => {
      const result = classifyError(new Error("ELEVENLABS_API_KEY not set"));
      expect(result.suggestion).toContain(".env.local");
    });

    it("suggests Python install for python not found", () => {
      const result = classifyError(new Error("python not found"));
      expect(result.suggestion).toContain("brew install python");
    });
  });
});
