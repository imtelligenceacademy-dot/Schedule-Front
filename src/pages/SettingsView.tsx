import { CalendarRange, History } from "lucide-react";
import { api } from "../api";
import { confirmAction } from "../forms";
import type { Catalog } from "../types";
import type { ModalHost } from "../workspace";

export function SettingsView({
  catalog,
  host,
  onActivated,
}: {
  catalog: Catalog;
  host: ModalHost;
  onActivated: (yearId: string) => void;
}) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Academic years</h2>
        <CalendarRange size={20} />
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Academic year</th>
              <th>Dates</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {catalog.academic_years.map((y) => (
              <tr key={y.id}>
                <td>
                  <strong>{y.name}</strong>
                </td>
                <td>
                  {y.start_date} — {y.end_date}
                </td>
                <td>
                  <span className={`badge ${y.active ? "green" : "gray"}`}>
                    {y.active ? "Current" : y.archived ? "Archived" : "Available"}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    {!y.active && !y.archived && (
                      <button
                        className="text-button"
                        onClick={() =>
                          confirmAction(
                            host,
                            "Change current academic year",
                            `Make ${y.name} the current academic year? Previous schedules and assignments will be preserved.`,
                            async () => {
                              await api(`/years/${y.id}/activate`, {
                                method: "POST",
                              });
                              onActivated(String(y.id));
                            },
                          )
                        }
                      >
                        Make current
                      </button>
                    )}
                    {!y.active && (
                      <button
                        className="text-button"
                        onClick={() =>
                          confirmAction(
                            host,
                            y.archived ? "Restore year" : "Archive year",
                            `${y.archived ? "Restore editing for" : "Make schedules read-only for"} ${y.name}?`,
                            async () => {
                              await api(`/years/${y.id}`, {
                                method: "PUT",
                                body: JSON.stringify({
                                  archived: !y.archived,
                                }),
                              });
                            },
                          )
                        }
                      >
                        {y.archived ? "Restore" : "Archive"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel-note">
        <History size={17} /> Archived years stay accessible. Teacher assignments are specific to
        each academic year.
      </div>
    </div>
  );
}
