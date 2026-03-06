// Clip catalog CRUD — manages data/clips/catalog.json and clip directories

import * as fs from "fs";
import * as path from "path";
import type { ClipMetadata, ClipCatalog } from "./types.js";

const CATALOG_VERSION = 1;

export class CatalogManager {
  private catalogDir: string;
  private catalogPath: string;

  constructor(catalogDir = "data/clips") {
    this.catalogDir = catalogDir;
    this.catalogPath = path.join(catalogDir, "catalog.json");
  }

  /** Load catalog from disk, create empty if missing */
  load(): ClipCatalog {
    if (!fs.existsSync(this.catalogPath)) {
      return { version: CATALOG_VERSION, clips: [] };
    }
    const raw = fs.readFileSync(this.catalogPath, "utf-8");
    return JSON.parse(raw) as ClipCatalog;
  }

  /** Save catalog to disk (atomic: write temp, rename) */
  save(catalog: ClipCatalog): void {
    fs.mkdirSync(this.catalogDir, { recursive: true });
    const tmpPath = this.catalogPath + ".tmp";
    fs.writeFileSync(tmpPath, JSON.stringify(catalog, null, 2), "utf-8");
    fs.renameSync(tmpPath, this.catalogPath);
  }

  /** Add a clip entry to the catalog */
  addClip(metadata: ClipMetadata): void {
    const catalog = this.load();
    // Replace if ID already exists
    catalog.clips = catalog.clips.filter((c) => c.id !== metadata.id);
    catalog.clips.push(metadata);
    this.save(catalog);
  }

  /** Remove a clip by ID — deletes files + catalog entry */
  removeClip(id: string): boolean {
    const catalog = this.load();
    const clip = catalog.clips.find((c) => c.id === id);
    if (!clip) return false;

    // Delete clip directory
    const clipDir = path.join(this.catalogDir, id);
    if (fs.existsSync(clipDir)) {
      fs.rmSync(clipDir, { recursive: true, force: true });
    }

    catalog.clips = catalog.clips.filter((c) => c.id !== id);
    this.save(catalog);
    return true;
  }

  /** Get a clip by ID */
  getClip(id: string): ClipMetadata | null {
    const catalog = this.load();
    return catalog.clips.find((c) => c.id === id) ?? null;
  }

  /** List clips with optional filter by tags or action type */
  listClips(filter?: { tags?: string[]; actionType?: string }): ClipMetadata[] {
    const catalog = this.load();
    let clips = catalog.clips;

    if (filter?.actionType) {
      clips = clips.filter((c) => c.actionType === filter.actionType);
    }
    if (filter?.tags && filter.tags.length > 0) {
      clips = clips.filter((c) =>
        filter.tags!.some((t) => c.tags.includes(t))
      );
    }
    return clips;
  }

  /** Generate a unique clip ID from action type + URL hostname + timestamp */
  generateClipId(actionType: string, url: string): string {
    const hostname = new URL(url).hostname.replace(/\./g, "-");
    const ts = Math.floor(Date.now() / 1000);
    return `${actionType}-${hostname}-${ts}`;
  }

  /** Get the directory path for a clip's assets */
  getClipDir(id: string): string {
    return path.join(this.catalogDir, id);
  }
}
