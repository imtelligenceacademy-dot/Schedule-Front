import { ArrowUpRight, Pencil, ShieldCheck } from "lucide-react";
import { api } from "../api";
import { Empty, initials } from "../components";
import { assignmentForm, confirmAction, teacherForm } from "../forms";
import type { Catalog, Year } from "../types";
import type { ModalHost } from "../workspace";

export function TeachersView({
  catalog,
  yearId,
  selectedYear,
  isSuper,
  host,
  onViewSchedule,
}: {
  catalog: Catalog;
  yearId: string;
  selectedYear?: Year;
  isSuper: boolean;
  host: ModalHost;
  onViewSchedule: (teacherId: number) => void;
}) {
  const contextAssignments = catalog.assignments.filter(
    (x) => String(x.academic_year_id) === yearId,
  );
  return (
    <div className="panel">
      {catalog.teachers.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Assigned school · {selectedYear?.name}</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {catalog.teachers.map((t) => {
                const a = contextAssignments.find((a) => a.teacher_id === t.id),
                  s = catalog.schools.find((s) => s.id === a?.school_id);
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="person">
                        <div className="avatar light">{initials(t.full_name)}</div>
                        <div>
                          <strong>{t.full_name}</strong>
                          <span>{t.email || "No email provided"}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {s ? (
                        <span className="school-label">
                          <i style={{ background: s.color }} />
                          {s.name}
                        </span>
                      ) : (
                        <span className="muted">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${t.active ? "green" : "gray"}`}>
                        {t.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="text-button" onClick={() => onViewSchedule(t.id)}>
                          Schedule <ArrowUpRight size={14} />
                        </button>
                        {isSuper && (
                          <>
                            <button
                              className="icon-button"
                              title="Edit teacher"
                              aria-label={`Edit ${t.full_name}`}
                              onClick={() => teacherForm(host, t)}
                            >
                              <Pencil size={16} />
                            </button>
                            {!selectedYear?.archived &&
                              yearId &&
                              (a ? (
                                <button
                                  className="text-button danger"
                                  onClick={() =>
                                    confirmAction(
                                      host,
                                      "Remove assignment",
                                      `Remove ${t.full_name} from ${s?.name} for ${selectedYear?.name}?`,
                                      async () => {
                                        await api(`/assignments/${a.id}`, {
                                          method: "DELETE",
                                        });
                                      },
                                    )
                                  }
                                >
                                  Unassign
                                </button>
                              ) : (
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    assignmentForm(host, catalog, yearId, selectedYear?.name, t)
                                  }
                                >
                                  Assign
                                </button>
                              ))}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No teachers yet">
          Add teachers, then assign each to a school for this academic year.
        </Empty>
      )}
      <div className="panel-note">
        <ShieldCheck size={17} /> One teacher is assigned to one school per academic year. A school
        can have multiple teachers.
      </div>
    </div>
  );
}
