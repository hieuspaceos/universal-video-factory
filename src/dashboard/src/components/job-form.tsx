// Job submission form — URL, feature, lang, brand, preview toggle

import { useState, type FormEvent } from "react";
import { createJob } from "../api-client.js";
import type { Job, JobCreateInput } from "../types.js";

interface Props {
  onJobCreated: (job: Job) => void;
  hasRunningJob: boolean;
}

interface FormState {
  url: string;
  feature: string;
  lang: string;
  brand: string;
  voice: string;
  cookies: string;
  preview: boolean;
}

const INITIAL: FormState = {
  url: "",
  feature: "",
  lang: "en",
  brand: "",
  voice: "",
  cookies: "",
  preview: false,
};

export function JobForm({ onJobCreated, hasRunningJob }: Props) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<FormState> = {};
    if (!form.url.trim()) {
      errs.url = "URL is required";
    } else if (!/^https?:\/\/.+/.test(form.url.trim())) {
      errs.url = "Must be a valid http/https URL";
    }
    if (!form.feature.trim()) errs.feature = "Feature description is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const input: JobCreateInput = {
        url: form.url.trim(),
        feature: form.feature.trim(),
        lang: form.lang || "en",
        ...(form.brand.trim() && { brand: form.brand.trim() }),
        ...(form.voice.trim() && { voice: form.voice.trim() }),
        ...(form.cookies.trim() && { cookies: form.cookies.trim() }),
        preview: form.preview,
      };
      const job = await createJob(input);
      setForm(INITIAL);
      onJobCreated(job);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || hasRunningJob;

  return (
    <form className="job-form" onSubmit={handleSubmit}>
      <div className="form-title">New Job</div>

      {hasRunningJob && (
        <div style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)", borderRadius: "6px", padding: "8px 12px", marginBottom: "16px", fontSize: "12px", color: "var(--accent)" }}>
          A job is already running. Wait for it to finish before submitting a new one.
        </div>
      )}

      <div className="form-field">
        <label className="form-label">
          URL <span>*</span>
        </label>
        <input
          type="url"
          placeholder="https://example.com/page"
          value={form.url}
          onChange={(e) => set("url", e.target.value)}
          disabled={disabled}
        />
        {errors.url && <div className="form-error">{errors.url}</div>}
      </div>

      <div className="form-field">
        <label className="form-label">
          Feature Description <span>*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. sign up flow, checkout process"
          value={form.feature}
          onChange={(e) => set("feature", e.target.value)}
          disabled={disabled}
        />
        {errors.feature && <div className="form-error">{errors.feature}</div>}
      </div>

      <div className="form-row">
        <div className="form-field">
          <label className="form-label">Language</label>
          <select
            value={form.lang}
            onChange={(e) => set("lang", e.target.value)}
            disabled={disabled}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="ja">Japanese</option>
            <option value="zh">Chinese</option>
            <option value="pt">Portuguese</option>
          </select>
        </div>
        <div className="form-field">
          <label className="form-label">Voice</label>
          <input
            type="text"
            placeholder="e.g. alloy"
            value={form.voice}
            onChange={(e) => set("voice", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Brand Config Path</label>
        <input
          type="text"
          placeholder="/path/to/brand.json"
          value={form.brand}
          onChange={(e) => set("brand", e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Cookies File Path</label>
        <input
          type="text"
          placeholder="/path/to/cookies.json"
          value={form.cookies}
          onChange={(e) => set("cookies", e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="form-field">
        <div className="toggle-row">
          <input
            type="checkbox"
            id="preview-toggle"
            checked={form.preview}
            onChange={(e) => set("preview", e.target.checked)}
            disabled={disabled}
          />
          <label className="toggle-label" htmlFor="preview-toggle">
            Preview mode (faster, lower quality)
          </label>
        </div>
      </div>

      {apiError && <div className="form-error" style={{ marginBottom: "12px" }}>{apiError}</div>}

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={disabled}>
          {submitting ? "Submitting…" : "Submit Job"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => { setForm(INITIAL); setErrors({}); setApiError(null); }}
          disabled={submitting}
        >
          Clear
        </button>
      </div>
    </form>
  );
}
