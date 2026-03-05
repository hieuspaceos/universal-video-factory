// Unit tests for src/cli/parse-arguments.ts

import { describe, it, expect } from "vitest";
import { parseArguments, ArgumentValidationError } from "../../src/cli/parse-arguments.js";

describe("parseArguments", () => {
  const validArgs = {
    url: "https://example.com",
    feature: "sign up",
  };

  it("returns valid config for minimal valid args", () => {
    const config = parseArguments(validArgs);
    expect(config.url).toBe("https://example.com");
    expect(config.feature).toBe("sign up");
    expect(config.lang).toBe("en");
    expect(config.manual).toBe(false);
    expect(config.output).toBe("./output");
  });

  it("preserves optional lang override", () => {
    const config = parseArguments({ ...validArgs, lang: "fr" });
    expect(config.lang).toBe("fr");
  });

  it("preserves optional output override", () => {
    const config = parseArguments({ ...validArgs, output: "/tmp/out" });
    expect(config.output).toBe("/tmp/out");
  });

  it("throws ArgumentValidationError for invalid URL", () => {
    expect(() => parseArguments({ ...validArgs, url: "not-a-url" }))
      .toThrow(ArgumentValidationError);
  });

  it("throws for non-http URL scheme", () => {
    expect(() => parseArguments({ ...validArgs, url: "ftp://example.com" }))
      .toThrow(/not allowed/);
  });

  it("throws for empty feature", () => {
    expect(() => parseArguments({ ...validArgs, feature: "   " }))
      .toThrow(ArgumentValidationError);
  });

  it("trims whitespace from feature", () => {
    const config = parseArguments({ ...validArgs, feature: "  checkout  " });
    expect(config.feature).toBe("checkout");
  });

  it("throws for non-existent brand path", () => {
    expect(() => parseArguments({ ...validArgs, brand: "/tmp/nonexistent-brand-file" }))
      .toThrow(ArgumentValidationError);
  });

  it("throws for non-existent cookies path", () => {
    expect(() => parseArguments({ ...validArgs, cookies: "/tmp/nonexistent-cookies.json" }))
      .toThrow(ArgumentValidationError);
  });

  it("throws for non-existent voice path", () => {
    expect(() => parseArguments({ ...validArgs, voice: "/tmp/nonexistent-voice.json" }))
      .toThrow(ArgumentValidationError);
  });

  it("accepts http:// URLs", () => {
    const config = parseArguments({ ...validArgs, url: "http://localhost:3000" });
    expect(config.url).toBe("http://localhost:3000");
  });
});
