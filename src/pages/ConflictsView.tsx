import { ArrowUpRight, TriangleAlert } from "lucide-react";
import { DAYS, Empty } from "../components";
import type { Conflict, Entry } from "../types";

export function ConflictsView({
  conflicts,
  writable,
  onEntry,
}: {
  conflicts: Conflict[];
  writable: boolean;
  onEntry: (x: Entry) => void;
}) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>
          {conflicts.length} {conflicts.length === 1 ? "conflict" : "conflicts"} to review
        </h2>
        <span className={`badge ${conflicts.length ? "orange" : "green"}`}>
          {conflicts.length ? "Needs attention" : "All clear"}
        </span>
      </div>
      {conflicts.length ? (
        <div className="conflict-list">
          {conflicts.map((c) => (
            <article className="conflict-card" key={c.id}>
              <div className="conflict-title">
                <TriangleAlert size={19} />
                <strong>{c.types.join(" & ")}</strong>
                <span>{DAYS[c.first.day]}</span>
              </div>
              <div className="conflict-pair">
                {[c.first, c.second].map((e) => (
                  <button key={e.id} onClick={() => onEntry(e)} className="conflict-entry">
                    <span className="school-label">
                      <i style={{ background: e.school_color }} />
                      {e.school_name}
                    </span>
                    <strong>
                      {e.grade} · {e.class_name}
                    </strong>
                    <span>
                      {e.teacher_name} · {e.start_time}–{e.end_time}
                    </span>
                    <span className="text-link">
                      {writable ? "Review & edit" : "View session"} <ArrowUpRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No overlapping sessions">
          Teacher and class schedules are clear for this academic year.
        </Empty>
      )}
    </div>
  );
}
