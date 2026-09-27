import { useState } from "react";
import { Clock3, Trash2 } from "lucide-react";
import { api } from "./api";
import { DAYS, ErrorBox, Field, Form, Modal, Text, datetime } from "./components";
import type { Catalog, Entry } from "./types";

export function SessionModal({
  entry,
  catalog,
  yearId,
  writable,
  isSuper,
  onClose,
  onSaved,
}: {
  entry?: Entry;
  catalog: Catalog;
  yearId: number;
  writable: boolean;
  isSuper: boolean;
  onClose: () => void;
  onSaved: (x?: string) => Promise<void>;
}) {
  const [current, setCurrent] = useState(entry),
    [schoolId, setSchoolId] = useState(String(entry?.school_id || "")),
    [refreshError, setRefreshError] = useState("");
  const [formKey, setFormKey] = useState(0);
  const year = current?.academic_year_id || yearId;
  const canWrite = writable && !catalog.academic_years.find((x) => x.id === year)?.archived;
  const assigned = catalog.assignments
    .filter((x) => x.academic_year_id === year && String(x.school_id) === schoolId)
    .map((x) => x.teacher_id);
  const teachers = catalog.teachers.filter((x) => assigned.includes(x.id) && x.active),
    classes = catalog.classes.filter((x) => String(x.school_id) === schoolId);
  return (
    <Modal
      title={current ? (canWrite ? "Edit session" : "Session details") : "Add robotics session"}
      description={catalog.academic_years.find((x) => x.id === year)?.name}
      onClose={onClose}
    >
      {current && (
        <div className="session-meta">
          <Clock3 size={15} />
          <span>
            Last updated by {current.updated_by_name}
            <br />
            {datetime(current.updated_at)} · Version {current.version}
          </span>
          {canWrite && (
            <button
              className="text-button"
              onClick={async () => {
                try {
                  const e = await api<Entry>(`/sessions/${current.id}`);
                  setCurrent(e);
                  setSchoolId(String(e.school_id));
                  setFormKey((x) => x + 1);
                  setRefreshError("");
                } catch (e) {
                  setRefreshError((e as Error).message);
                }
              }}
            >
              Reload latest
            </button>
          )}
        </div>
      )}
      <ErrorBox error={refreshError} />
      {!canWrite && current ? (
        <div className="form-body">
          <dl className="session-details">
            <dt>School</dt>
            <dd>{current.school_name}</dd>
            <dt>Teacher</dt>
            <dd>{current.teacher_name}</dd>
            <dt>Class</dt>
            <dd>
              {current.grade} · {current.class_name}
            </dd>
            <dt>Schedule</dt>
            <dd>
              {DAYS[current.day]} · {current.start_time}–{current.end_time}
            </dd>
            <dt>Notes</dt>
            <dd>{current.notes || "—"}</dd>
          </dl>
          <button className="button secondary" onClick={onClose}>
            Close
          </button>
        </div>
      ) : (
        <Form
          key={formKey}
          onCancel={onClose}
          label={current ? "Save changes" : "Add session"}
          onSave={async (f) => {
            const body = {
              academic_year_id: year,
              school_id: Number(schoolId),
              teacher_id: Number(f.get("teacher_id")),
              class_id: Number(f.get("class_id")),
              day: Number(f.get("day")),
              start_time: f.get("start_time"),
              end_time: f.get("end_time"),
              notes: f.get("notes"),
              ...(current ? { expected_version: current.version } : {}),
            };
            await api(`/sessions${current ? "/" + current.id : ""}`, {
              method: current ? "PUT" : "POST",
              body: JSON.stringify(body),
            });
            await onSaved();
          }}
        >
          <Field label="School">
            <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} required>
              <option value="">Select school</option>
              {catalog.schools
                .filter((x) => x.active)
                .map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Assigned teacher">
              <select
                key={`t-${schoolId}-${formKey}`}
                name="teacher_id"
                defaultValue={String(current?.school_id) === schoolId ? current?.teacher_id : ""}
                required
              >
                <option value="">Select teacher</option>
                {teachers.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.full_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Grade / class">
              <select
                key={`c-${schoolId}-${formKey}`}
                name="class_id"
                defaultValue={String(current?.school_id) === schoolId ? current?.class_id : ""}
                required
              >
                <option value="">Select class</option>
                {classes.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.grade} · {x.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {schoolId && (!teachers.length || !classes.length) && (
            <div className="notice">
              {!teachers.length ? "Ask a Super Admin to assign a teacher to this school. " : ""}
              {!classes.length ? "Add a class from the Schools page." : ""}
            </div>
          )}
          <Field label="Day">
            <select name="day" defaultValue={current?.day ?? 0}>
              {DAYS.map((x, i) => (
                <option key={x} value={i}>
                  {x}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Start time">
              <Text type="time" name="start_time" value={current?.start_time || "08:00"} />
            </Field>
            <Field label="End time">
              <Text type="time" name="end_time" value={current?.end_time || "08:50"} />
            </Field>
          </div>
          <Field label="Notes (optional)">
            <textarea name="notes" rows={3} maxLength={2000} defaultValue={current?.notes || ""} />
          </Field>
          <div className="notice">
            Sessions repeat weekly within the academic year. Overlaps appear on the Conflicts page.
          </div>
          {current && isSuper && (
            <button
              type="button"
              className="text-button danger"
              onClick={async () => {
                if (
                  !window.confirm("Delete this session? This action is recorded in the audit log.")
                )
                  return;
                try {
                  await api(`/sessions/${current.id}?expected_version=${current.version}`, {
                    method: "DELETE",
                  });
                  await onSaved("Session deleted.");
                } catch (e) {
                  setRefreshError((e as Error).message);
                }
              }}
            >
              <Trash2 size={15} /> Delete session
            </button>
          )}
        </Form>
      )}
    </Modal>
  );
}
