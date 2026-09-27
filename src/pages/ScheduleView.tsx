import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, Download, TriangleAlert, ZoomIn, ZoomOut } from "lucide-react";
import { DAYS, Empty, initials } from "../components";
import { useDragScroll, useMediaQuery } from "../hooks";
import type { Catalog, Conflict, Entry } from "../types";

// scale: pixels per minute; card: minimum card height; column: minimum day column width.
const ZOOMS = [
  { label: "50%", scale: 1.2, card: 52, column: 140 },
  { label: "75%", scale: 1.8, card: 78, column: 175 },
  { label: "100%", scale: 2.4, card: 108, column: 210 },
  { label: "125%", scale: 3, card: 118, column: 250 },
  { label: "150%", scale: 3.6, card: 128, column: 290 },
];
const DEFAULT_ZOOM = 2;
const ZOOM_KEY = "schedule-zoom";

function savedZoom() {
  try {
    const stored = localStorage.getItem(ZOOM_KEY);
    const value = Number(stored);
    return stored !== null && Number.isInteger(value) && ZOOMS[value] ? value : DEFAULT_ZOOM;
  } catch {
    return DEFAULT_ZOOM;
  }
}
const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

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
  const [zoomIndex, setZoomIndex] = useState(savedZoom);
  const mobile = useMediaQuery("(max-width: 760px)");
  const [mobileDay, setMobileDay] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const viewId = useId();
  const views = ["Timeline", "Compact", "Teacher Columns", "School Columns"];
  const zoom = ZOOMS[zoomIndex];
  const { scale, card: cardHeight } = zoom;
  const density = zoomIndex === 0 ? "dense" : zoomIndex === 1 ? "tight" : "";
  useDragScroll(scrollRef, `${view}-${entries.length > 0}`);
  function changeView(next: string) {
    setView(next);
    onRefresh();
  }
  function changeZoom(next: number) {
    const index = Math.min(ZOOMS.length - 1, Math.max(0, next));
    setZoomIndex(index);
    try {
      localStorage.setItem(ZOOM_KEY, String(index));
    } catch {
      // Zoom still works for this visit without storage.
    }
  }
  // Ctrl + mouse wheel zooms the schedule instead of the whole page.
  const zoomRef = useRef(zoomIndex);
  zoomRef.current = zoomIndex;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      changeZoom(zoomRef.current + (e.deltaY < 0 ? 1 : -1));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [view, entries.length > 0]);
  const conflictIds = new Set(conflicts.flatMap((x) => [x.first.id, x.second.id]));
  const days = [...new Set(entries.map((x) => x.day))].sort((a, b) => a - b);
  const today = (new Date().getDay() + 6) % 7;
  const selectedDay =
    mobileDay !== null && days.includes(mobileDay)
      ? mobileDay
      : days.includes(today)
        ? today
        : days[0];
  const shownDays = mobile ? days.filter((d) => d === selectedDay) : days;
  const card = (e: Entry) => (
    <button
      key={e.id}
      className={`schedule-block ${conflictIds.has(e.id) ? "has-conflict" : ""}`}
      style={{
        borderLeftColor: e.school_color,
        background: e.school_color + "12",
      }}
      title={`${e.school_name}\n${e.grade} · ${e.class_name}\n${e.teacher_name}\n${DAYS[e.day]} ${e.start_time}–${e.end_time}`}
      onClick={() => onEntry(e)}
    >
      <span className="block-school">{e.school_name}</span>
      <strong>
        {e.grade} · {e.class_name}
      </strong>
      <span className="block-teacher">
        {initials(e.teacher_name)} · {e.teacher_name}
      </span>
      <span className="block-time">
        {e.start_time}–{e.end_time}
        {conflictIds.has(e.id) && <TriangleAlert size={14} />}
      </span>
    </button>
  );
  const start = Math.floor(Math.min(480, ...entries.map((x) => toMinutes(x.start_time))) / 60) * 60;
  const end = Math.ceil(Math.max(900, ...entries.map((x) => toMinutes(x.end_time))) / 60) * 60;
  const slots = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60);
  function lanes(dayEntries: Entry[]) {
    const laneEnds: number[] = [];
    return dayEntries.map((e) => {
      const begin = toMinutes(e.start_time),
        finish = toMinutes(e.end_time);
      let lane = laneEnds.findIndex((x) => x <= begin);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = Math.max(finish, begin + (cardHeight + 4) / scale);
      const top = (begin - start) * scale,
        height = Math.max(cardHeight, (finish - begin) * scale - 4);
      return { entry: e, lane, top, height };
    });
  }
  const dayLayouts = shownDays.map((d) => {
    const positioned = lanes(entries.filter((x) => x.day === d));
    return { day: d, positioned, count: Math.max(1, ...positioned.map((x) => x.lane + 1)) };
  });
  // Tall enough for the last card and hour label, so the timeline never scrolls vertically.
  const height = Math.max(
    (end - start) * scale + 28,
    ...dayLayouts.flatMap((x) => x.positioned.map((p) => p.top + p.height + 12)),
  );
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
          {view !== "Compact" && (
            <div className="zoom-controls" role="group" aria-label="Schedule zoom">
              <button
                className="icon-button"
                aria-label="Zoom out"
                title="Zoom out (Ctrl + scroll)"
                disabled={zoomIndex === 0}
                onClick={() => changeZoom(zoomIndex - 1)}
              >
                <ZoomOut size={16} />
              </button>
              <button
                className="zoom-level"
                title="Reset zoom"
                aria-label={`Zoom ${zoom.label}, reset`}
                onClick={() => changeZoom(DEFAULT_ZOOM)}
              >
                {zoom.label}
              </button>
              <button
                className="icon-button"
                aria-label="Zoom in"
                title="Zoom in (Ctrl + scroll)"
                disabled={zoomIndex === ZOOMS.length - 1}
                onClick={() => changeZoom(zoomIndex + 1)}
              >
                <ZoomIn size={16} />
              </button>
            </div>
          )}
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
            <table className="compact-table">
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
                  <tr key={e.id} onClick={mobile ? () => onEntry(e) : undefined}>
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
          <>
            {mobile && (
              <div className="day-picker">
                <div className="day-chips" role="group" aria-label="Day">
                  {days.map((d) => {
                    const count = entries.filter((x) => x.day === d).length;
                    return (
                      <button
                        key={d}
                        aria-label={`${DAYS[d]}, ${count} sessions`}
                        aria-pressed={d === selectedDay}
                        className={d === selectedDay ? "active" : ""}
                        onClick={() => setMobileDay(d)}
                      >
                        {DAYS[d].slice(0, 3)}
                        <span>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="timeline-scroll" ref={scrollRef}>
              <div
                className={`timeline ${density} ${mobile ? "single" : ""}`}
                style={{
                  gridTemplateColumns: mobile
                    ? "44px minmax(0, 1fr)"
                    : `66px repeat(${shownDays.length}, minmax(${zoom.column}px, 1fr))`,
                }}
              >
                <div className="timeline-day time-heading">TIME</div>
                {shownDays.map((d) => (
                  <div className="timeline-day" key={d}>
                    {DAYS[d]}
                    <span>{entries.filter((x) => x.day === d).length} sessions</span>
                  </div>
                ))}
                <div className="time-axis" style={{ height }}>
                  {slots.map((t) => (
                    <span key={t} style={{ top: (t - start) * scale }}>
                      {String(Math.floor(t / 60)).padStart(2, "0")}:00
                    </span>
                  ))}
                </div>
                {dayLayouts.map(({ day, positioned, count }) => (
                  <div
                    key={day}
                    className="timeline-column"
                    style={{
                      height,
                      minWidth: count > 1 ? count * (mobile ? 150 : zoom.column - 20) : undefined,
                    }}
                  >
                    {slots.map((t) => (
                      <div key={t} className="hour-line" style={{ top: (t - start) * scale }} />
                    ))}
                    {positioned.map(({ entry: e, lane, top, height: cardSize }) => (
                      <div
                        key={e.id}
                        className="timeline-position"
                        style={{
                          top,
                          height: cardSize,
                          left: `calc(${(lane / count) * 100}% + 4px)`,
                          width: `calc(${100 / count}% - 8px)`,
                        }}
                      >
                        {card(e)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="columns-scroll" ref={scrollRef}>
            <div className={`schedule-columns ${density}`}>
              {(view === "Teacher Columns"
                ? catalog.teachers
                    .filter((x) => entries.some((e) => e.teacher_id === x.id))
                    .map((x) => ({ id: x.id, name: x.full_name }))
                : catalog.schools
                    .filter((x) => entries.some((e) => e.school_id === x.id))
                    .map((x) => ({ id: x.id, name: x.name }))
              ).map((group) => (
                <div
                  className="schedule-group"
                  key={group.id}
                  style={mobile ? undefined : { width: zoom.column + 50 }}
                >
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
