import { Pencil, Plus, School as SchoolIcon } from "lucide-react";
import { Empty, initials } from "../components";
import { assignmentForm, classForm, schoolForm } from "../forms";
import type { Catalog, Year } from "../types";
import type { ModalHost } from "../workspace";

export function SchoolsView({
  catalog,
  yearId,
  selectedYear,
  isSuper,
  canEdit,
  host,
}: {
  catalog: Catalog;
  yearId: string;
  selectedYear?: Year;
  isSuper: boolean;
  canEdit: boolean;
  host: ModalHost;
}) {
  const contextAssignments = catalog.assignments.filter(
    (x) => String(x.academic_year_id) === yearId,
  );
  return catalog.schools.length ? (
    <div className="school-grid">
      {catalog.schools.map((s) => {
        const assigned = contextAssignments.filter((a) => a.school_id === s.id);
        const classList = catalog.classes.filter((c) => c.school_id === s.id);
        return (
          <article className="school-card" key={s.id} style={{ borderTopColor: s.color }}>
            <div className="school-card-head">
              <div
                className="school-symbol"
                style={{
                  background: s.color + "16",
                  color: s.color,
                }}
              >
                <SchoolIcon size={23} />
              </div>
              {isSuper && (
                <button
                  className="icon-button"
                  title={`Edit ${s.name}`}
                  aria-label={`Edit ${s.name}`}
                  onClick={() => schoolForm(host, s)}
                >
                  <Pencil size={17} />
                </button>
              )}
            </div>
            <h2>{s.name}</h2>
            <span className={`badge ${s.active ? "green" : "gray"}`}>
              {s.active ? "Active" : "Inactive"}
            </span>
            <div className="card-divider" />
            <div className="small-heading">TEACHERS · {selectedYear?.name}</div>
            <div className="assigned-teachers">
              {assigned.length ? (
                assigned.map((a) => {
                  const t = catalog.teachers.find((t) => t.id === a.teacher_id);
                  return (
                    <div key={a.id}>
                      <span className="mini-avatar">{initials(t?.full_name || "?")}</span>
                      {t?.full_name}
                    </div>
                  );
                })
              ) : (
                <p className="muted">No teachers assigned</p>
              )}
            </div>
            <div className="card-divider" />
            <div className="row-between">
              <span className="small-heading">CLASSES ({classList.length})</span>
              {canEdit && s.active && (
                <button className="text-button" onClick={() => classForm(host, s.id)}>
                  <Plus size={14} /> Add class
                </button>
              )}
            </div>
            <div className="class-chips">
              {classList.map((c) => (
                <span key={c.id}>
                  {c.grade} · {c.name}
                </span>
              ))}
            </div>
            {isSuper && !selectedYear?.archived && yearId && (
              <button
                className="button secondary full-width"
                onClick={() => assignmentForm(host, catalog, yearId, selectedYear?.name)}
              >
                <Plus size={16} /> Assign teacher
              </button>
            )}
          </article>
        );
      })}
    </div>
  ) : (
    <Empty title="No schools yet">Add the schools your robotics team works with.</Empty>
  );
}
