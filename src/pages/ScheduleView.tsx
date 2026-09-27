import { useId, useState } from "react";
import { ChevronRight, Download, TriangleAlert } from "lucide-react";
import { DAYS, Empty, initials } from "../components";
import type { Catalog, Conflict, Entry } from "../types";

export function ScheduleView({
  entries,
  onEntry,
  catalog,
  conflicts,
  canExport,
  onExport,
  onRefresh,
}: {
  entries: Entry[];
  onEntry: (x: Entry) => void;
  catalog: Catalog;
  conflicts: Conflict[];
  canExport: boolean;
  onExport: (x: string) => void;
  onRefresh: () => void;
}) {
  const [view, setView] = useState("Timeline");
  const viewId = useId();
  const views = ["Timeline", "Compact", "Teacher Columns", "School Columns"];
  const scale = 2.4;
  const cardHeight = 108;
  function changeView(next: string) {
    setView(next);
    onRefresh();
  }
  const conflictIds = new Set(conflicts.flatMap((x) => [x.first.id, x.second.id]));
  const days = [...new Set(entries.map((x) => x.day))].sort((a, b) => a - b);
  const card = (e: Entry) => (
    <button
      key={e.id}
      className={`schedule-block ${conflictIds.has(e.id) ? "has-conflict" : ""}`}
      style={{
        borderLeftColor: e.school_color,
        background: e.school_color + "12",
      }}
      onClick={() => onEntry(e)}
    >
      <span className="block-school">{e.school_name}</span>
      <strong>
        {e.grade} · {e.class_name}
      </strong>
      <span>
        {initials(e.teacher_name)} · {e.teacher_name}
      </span>
      <span className="block-time">
        {e.start_time}–{e.end_time}
        {conflictIds.has(e.id) && <TriangleAlert size={14} />}
      </span>
    </button>
  );
  const start =
    Math.floor(
      Math.min(
        480,
        ...entries.map(
          (x) => Number(x.start_time.slice(0, 2)) * 60 + Number(x.start_time.slice(3)),
        ),
      ) / 60,
    ) * 60;
  const end =
    Math.ceil(
      Math.max(
        900,
        ...entries.map((x) => Number(x.end_time.slice(0, 2)) * 60 + Number(x.end_time.slice(3))),
      ) / 60,
    ) * 60;
  const slots = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60);
  function lanes(dayEntries: Entry[]) {
    const laneEnds: number[] = [];
    return dayEntries.map((e) => {
      const begin = Number(e.start_time.slice(0, 2)) * 60 + Number(e.start_time.slice(3)),
        finish = Number(e.end_time.slice(0, 2)) * 60 + Number(e.end_time.slice(3));
      let lane = laneEnds.findIndex((x) => x <= begin);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = Math.max(finish, begin + (cardHeight + 4) / scale);
      return { entry: e, lane, begin, finish };
    });
  }
  return (
    <section className="panel schedule-panel">
      <div className="schedule-toolbar">
        <div className="view-tabs" role="tablist" aria-label="Schedule view">
          {views.map((x) => (
            <button
              role="tab"
              id={`${viewId}-${views.indexOf(x)}`}
              aria-controls={`${viewId}-panel`}
              aria-selected={view === x}
              tabIndex={view === x ? 0 : -1}
              key={x}
              onClick={() => changeView(x)}
              onKeyDown={(event) => {
                const index = views.indexOf(view);
                const next =
                  event.key === "ArrowRight"
                    ? (index + 1) % views.length
                    : event.key === "ArrowLeft"
                      ? (index + views.length - 1) % views.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? views.length - 1
                          : -1;
                if (next >= 0) {
                  event.preventDefault();
                  changeView(views[next]);
                  document.getElementById(`${viewId}-${next}`)?.focus();
                }
              }}
              className={view === x ? "active" : ""}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="export-actions">
          <span className="muted">{entries.length} sessions</span>
          {canExport && (
            <>
              <button className="button secondary small" onClick={() => onExport("csv")}>
                <Download size={15} /> CSV
              </button>
              <button className="button secondary small" onClick={() => onExport("xlsx")}>
                Excel
              </button>
            </>
          )}
        </div>
      </div>
      <div className="school-legend">
        {catalog.schools
          .filter((s) => entries.some((e) => e.school_id === s.id))
          .map((s) => (
            <span key={s.id}>
              <i style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
      </div>
      <div
        role="tabpanel"
        id={`${viewId}-panel`}
        aria-labelledby={`${viewId}-${views.indexOf(view)}`}
      >
        {!entries.length ? (
          <Empty title="No sessions found">
            Adjust your filters or add a session for this academic year.
          </Empty>
        ) : view === "Compact" ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Day & time</th>
                  <th>School</th>
                  <th>Teacher</th>
                  <th>Grade / class</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{DAYS[e.day]}</strong>
                      <span className="cell-sub">
                        {e.start_time}–{e.end_time}
                      </span>
                    </td>
                    <td>
                      <span className="school-label">
                        <i style={{ background: e.school_color }} />
                        {e.school_name}
                      </span>
                    </td>
                    <td>{e.teacher_name}</td>
                    <td>
                      {e.grade} · {e.class_name}
                    </td>
                    <td>
                      {conflictIds.has(e.id) ? (
                        <span className="badge orange">Overlap</span>
                      ) : (
                        <span className="badge green">Clear</span>
                      )}
                    </td>
                    <td>
                      <button className="text-button" onClick={() => onEntry(e)}>
                        Open <ChevronRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : view === "Timeline" ? (
          <div className="timeline-scroll">
            <div
              className="timeline"
              style={{
                gridTemplateColumns: `66px repeat(${days.length}, minmax(210px, 1fr))`,
              }}
            >
              <div className="timeline-day time-heading">TIME</div>
              {days.map((d) => (
                <div className="timeline-day" key={d}>
                  {DAYS[d]}
                  <span>{entries.filter((x) => x.day === d).length} sessions</span>
                </div>
              ))}
              <div className="time-axis" style={{ height: (end - start) * scale }}>
                {slots.map((t) => (
                  <span key={t} style={{ top: (t - start) * scale }}>
                    {String(Math.floor(t / 60)).padStart(2, "0")}:00
                  </span>
                ))}
              </div>
              {days.map((d) => {
                const dayLanes = lanes(entries.filter((x) => x.day === d)),
                  count = Math.max(1, ...dayLanes.map((x) => x.lane + 1));
                return (
                  <div
                    key={d}
                    className="timeline-column"
                    style={{ height: (end - start) * scale, minWidth: count * 190 }}
                  >
                    {slots.map((t) => (
                      <div key={t} className="hour-line" style={{ top: (t - start) * scale }} />
                    ))}
                    {dayLanes.map(({ entry: e, lane, begin, finish }) => (
                      <div
                        key={e.id}
                        className="timeline-position"
                        style={{
                          top: (begin - start) * scale,
                          height: Math.max(cardHeight, (finish - begin) * scale - 4),
                          left: `calc(${(lane / count) * 100}% + 4px)`,
                          width: `calc(${100 / count}% - 8px)`,
                        }}
                      >
                        {card(e)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="columns-scroll">
            <div className="schedule-columns">
              {(view === "Teacher Columns"
                ? catalog.teachers
                    .filter((x) => entries.some((e) => e.teacher_id === x.id))
                    .map((x) => ({ id: x.id, name: x.full_name }))
                : catalog.schools
                    .filter((x) => entries.some((e) => e.school_id === x.id))
                    .map((x) => ({ id: x.id, name: x.name }))
              ).map((group) => (
                <div className="schedule-group" key={group.id}>
                  <h3>{group.name}</h3>
                  {days.map((d) => {
                    const selected = entries.filter(
                      (x) =>
                        x.day === d &&
                        (view === "Teacher Columns" ? x.teacher_id : x.school_id) === group.id,
                    );
                    return selected.length ? (
                      <div className="day-group" key={d}>
                        <span className="small-heading">{DAYS[d]}</span>
                        {selected.map(card)}
                      </div>
                    ) : null;
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
