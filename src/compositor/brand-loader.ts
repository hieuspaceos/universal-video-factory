// Brand config loader — validates brand.json against Zod schema, returns typed config

import * as fs from "fs/promises";
import * as path from "path";
import { z } from "zod";

// --- Zod schema ---

const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color");

const BrandColorsSchema = z.object({
  primary:    HexColorSchema,
  secondary:  HexColorSchema.optional(),
  accent:     HexColorSchema,
  text:       HexColorSchema.optional(),
  background: HexColorSchema.optional(),
});

const BrandFontsSchema = z.object({
  heading: z.string().optional(),
  body:    z.string().optional(),
});

const BrandIntroSchema = z.object({
  tagline:  z.string().optional(),
  duration: z.number().positive().default(3),
});

const BrandOutroSchema = z.object({
  cta:      z.string().optional(),
  url:      z.string().url().optional(),
  duration: z.number().positive().default(4),
});

export const BrandConfigSchema = z.object({
  name:   z.string(),
  logo:   z.string().optional(),
  colors: BrandColorsSchema,
  fonts:  BrandFontsSchema.optional(),
  intro:  BrandIntroSchema.optional(),
  outro:  BrandOutroSchema.optional(),
});

export type BrandConfig = z.infer<typeof BrandConfigSchema>;

// --- Default brand (mirrors brand/default-brand.json) ---

const DEFAULT_BRAND: BrandConfig = {
  name: "Video Factory",
  colors: {
    primary:    "#2563EB",
    secondary:  "#1E40AF",
    accent:     "#FFD700",
    text:       "#FFFFFF",
    background: "#0F172A",
  },
  fonts:  { heading: "Inter", body: "Inter" },
  intro:  { tagline: "Tutorial auto-generated", duration: 3 },
  outro:  { cta: "Try it yourself", url: "https://github.com", duration: 4 },
};

// --- Default brand.json path ---

const DEFAULT_BRAND_PATH = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../brand/default-brand.json"
);

/**
 * Load + validate a brand.json file.
 *
 * - If no path is given, uses brand/default-brand.json.
 * - Logo path is resolved relative to the brand.json's directory.
 * - Throws ZodError on invalid schema.
 * - Falls back to DEFAULT_BRAND if file not found and no path supplied.
 */
export async function loadBrand(brandPath?: string): Promise<BrandConfig> {
  const filePath = brandPath ?? DEFAULT_BRAND_PATH;

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    if (!brandPath) {
      // Default file missing — use hardcoded defaults
      return DEFAULT_BRAND;
    }
    throw new Error(`Brand file not found: ${filePath}`);
  }

  const parsed = JSON.parse(raw);
  const validated = BrandConfigSchema.parse(parsed);

  // Resolve logo path relative to brand.json location
  if (validated.logo) {
    const brandDir = path.dirname(filePath);
    validated.logo = path.resolve(brandDir, validated.logo);
  }

  return validated;
}

/**
 * Map BrandConfig to the minimal BrandProps expected by Remotion components.
 * (Remotion components only need name, logo, colors.primary, colors.accent, tagline)
 */
export function toRemotion(brand: BrandConfig) {
  return {
    name:    brand.name,
    logo:    brand.logo,
    colors:  {
      primary: brand.colors.primary,
      accent:  brand.colors.accent,
    },
    tagline: brand.intro?.tagline,
  };
}
