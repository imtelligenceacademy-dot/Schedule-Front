import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Loader2, TriangleAlert, Upload } from "lucide-react";
import { api, download } from "../api";
import { ErrorBox } from "../components";
import type { ImportResult } from "../types";

export function ImportView({
  yearId,
  archived,
  isSuper,
  onSaved,
}: {
  yearId: string;
  archived: boolean;
  isSuper: boolean;
  onSaved: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null),
    [result, setResult] = useState<ImportResult | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [createMissing, setCreateMissing] = useState(true);
  useEffect(() => {
    setResult(null);
  }, [yearId]);
  async function run(dryRun: boolean) {
    if (!file) return;
    setError("");
    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const r = await api<ImportResult>(
        `/import?academic_year_id=${yearId}&dry_run=${dryRun}&create_missing=${isSuper && createMissing}`,
        {
          method: "POST",
          body,
        },
      );
      setResult(r);
      if (r.imported) {
        await onSaved();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="import-layout">
      <section className="panel">
        <div className="panel-head">
          <h2>Import schedule sessions</h2>
          <FileSpreadsheet size={21} />
        </div>
        <div className="import-body">
          <div className="upload-area">
            <div className="upload-symbol">
              <Upload size={27} />
            </div>
            <h3>Choose an Excel or CSV file</h3>
            <p>Up to 5 MB · 2,000 rows per import</p>
            <input
              aria-label="Schedule import file"
              type="file"
              accept=".csv,.xlsx"
              disabled={busy || archived || !yearId}
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
                setError("");
              }}
            />
          </div>
          {isSuper && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={createMissing}
                disabled={busy || archived || !yearId}
                onChange={(e) => {
                  setCreateMissing(e.target.checked);
                  setResult(null);
                }}
              />
              Create missing schools, teachers and yearly assignments
            </label>
          )}
          <ErrorBox error={error} />
          <div className="import-buttons">
            <button
              className="button primary"
              disabled={!file || busy || archived || !yearId}
              onClick={() => void run(true)}
            >
              {busy && <Loader2 className="spin" size={16} />} Validate file
            </button>
            {result?.dry_run && result.valid_rows > 0 && !result.errors.length && (
              <button
                className="button primary"
                disabled={busy || archived || !yearId}
                onClick={() => void run(false)}
              >
                Import {result.valid_rows} sessions
              </button>
            )}
          </div>
          {result && (
            <div className="import-result">
              <strong>
                {result.imported
                  ? `${result.imported} sessions imported`
                  : result.errors.length
                    ? "Import needs correction"
                    : `${result.valid_rows} valid sessions`}
              </strong>
              <p>
                {result.imported
                  ? "Your team can now see these sessions."
                  : result.errors.length
                    ? "No sessions were saved. Correct the listed rows and validate again."
                    : "Validation only. Click Import to save these sessions."}
              </p>
              {result.new_records && !result.errors.length && (
                <div className="import-records">
                  <strong>
                    {result.imported ? "Records created" : "Records to create on import"}
                  </strong>
                  <p>
                    {result.new_records.schools.length}{" "}
                    {result.new_records.schools.length === 1 ? "school" : "schools"},{" "}
                    {result.new_records.teachers.length}{" "}
                    {result.new_records.teachers.length === 1 ? "teacher" : "teachers"},{" "}
                    {result.new_records.assignments.length}{" "}
                    {result.new_records.assignments.length === 1
                      ? "yearly assignment"
                      : "yearly assignments"}{" "}
                    and {result.new_records.classes}{" "}
                    {result.new_records.classes === 1 ? "class" : "classes"}.
                  </p>
                  {!!result.new_records.schools.length && (
                    <p>Schools: {result.new_records.schools.join(", ")}</p>
                  )}
                  {!!result.new_records.teachers.length && (
                    <details>
                      <summary>View new teacher names</summary>
                      <p>{result.new_records.teachers.join(", ")}</p>
                    </details>
                  )}
                </div>
              )}
              {result.conflicts.length > 0 && (
                <div className="notice">
                  <TriangleAlert size={17} />
                  {result.conflicts.length} overlapping session pairs. Review Conflicts after
                  importing.
                </div>
              )}
              {result.errors.map((e, i) => (
                <div className="import-row-error" key={i}>
                  <strong>Row {e.row}</strong>
                  <span>{e.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <aside className="panel import-guide">
        <h2>Before you import</h2>
        <ol>
          <li>
            {isSuper
              ? "Keep creation of missing records enabled to add schools, teachers and assignments from your file."
              : "Ask a Super Admin to add schools, teachers and yearly assignments first."}
          </li>
          <li>Each teacher can belong to only one school for the selected year.</li>
          <li>Use the template columns. New classes will be created automatically.</li>
          <li>Validate, review overlaps, then import.</li>
        </ol>
        <button
          className="button secondary full-width"
          onClick={() =>
            void download("/import/template", "schedule-import-template.csv").catch((e) =>
              setError((e as Error).message),
            )
          }
        >
          <Download size={16} /> Download CSV template
        </button>
        <div className="card-divider" />
        <span className="small-heading">REQUIRED COLUMNS</span>
        <p className="column-guide">school, teacher, grade, class, day, start_time, end_time</p>
        <p className="muted">
          Optional: notes. Use weekday names and times like 08:00. Excel files use the active
          worksheet.
        </p>
        <div className="notice">
          Imports add sessions. Exact duplicates are rejected. Existing sessions are never
          overwritten.
        </div>
      </aside>
    </div>
  );
}
