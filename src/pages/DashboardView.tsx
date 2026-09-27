import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  School as SchoolIcon,
  ShieldCheck,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import { DAYS, Empty } from "../components";
import type { Dashboard, Entry } from "../types";
import type { Page } from "../workspace";

export function DashboardView({
  data,
  onEntry,
  navigate,
}: {
  data: Dashboard;
  onEntry: (x: Entry) => void;
  navigate: (x: Page) => void;
}) {
  const stats = [
    {
      label: "Active schools",
      value: data.active_schools,
      icon: SchoolIcon,
      color: "blue",
    },
    {
      label: "Teachers",
      value: data.teachers,
      icon: UsersRound,
      color: "purple",
    },
    {
      label: "Weekly sessions",
      value: data.weekly_sessions,
      icon: CalendarDays,
      color: "cyan",
    },
    {
      label: "Teaching hours / week",
      value: data.weekly_hours,
      icon: Clock3,
      color: "orange",
    },
    {
      label: "Conflicts",
      value: data.conflicts,
      icon: TriangleAlert,
      color: data.conflicts ? "red" : "green",
    },
  ];
  return (
    <>
      <div className="stats-grid">
        {stats.map((s) => (
          <button
            className="stat-card"
            key={s.label}
            onClick={() =>
              navigate(
                s.label === "Conflicts"
                  ? "Conflicts"
                  : s.label === "Teachers"
                    ? "Teachers"
                    : s.label === "Active schools"
                      ? "Schools"
                      : "All Schedules",
              )
            }
          >
            <div className={`stat-icon ${s.color}`}>
              <s.icon size={20} />
            </div>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
            <ArrowUpRight className="stat-arrow" size={16} />
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel today-panel">
          <div className="panel-head">
            <div>
              <span className="small-heading">IN THE CLASSROOM</span>
              <h2>Today’s robotics sessions</h2>
            </div>
            <span className="badge blue">
              {new Date(data.date + "T12:00:00").toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          {data.today.length ? (
            <div className="today-list">
              {data.today.map((e) => (
                <button className="today-row" key={e.id} onClick={() => onEntry(e)}>
                  <div className="session-time">
                    <strong>{e.start_time}</strong>
                    <span>{e.end_time}</span>
                  </div>
                  <span className="session-marker" style={{ background: e.school_color }} />
                  <div className="today-info">
                    <strong>{e.school_name}</strong>
                    <span>
                      {e.grade} · {e.class_name} <b>·</b> {e.teacher_name}
                    </span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          ) : (
            <Empty title="No sessions today">
              Enjoy the breathing room. Your upcoming sessions are below.
            </Empty>
          )}
          <button className="panel-link" onClick={() => navigate("All Schedules")}>
            Open full schedule <ArrowUpRight size={16} />
          </button>
        </section>
        <section className="panel upcoming-panel">
          <div className="panel-head">
            <div>
              <span className="small-heading">ON THE HORIZON</span>
              <h2>Upcoming sessions</h2>
            </div>
            <CalendarDays size={20} />
          </div>
          {data.upcoming.length ? (
            <div className="upcoming-list">
              {data.upcoming.slice(0, 5).map((e) => (
                <button key={e.id} className="upcoming-row" onClick={() => onEntry(e)}>
                  <div className="date-tile">
                    <span>
                      {new Date(e.next_date + "T12:00:00").toLocaleDateString(undefined, {
                        month: "short",
                      })}
                    </span>
                    <strong>{e.next_date.slice(-2)}</strong>
                  </div>
                  <div>
                    <strong>{e.school_name}</strong>
                    <span>
                      {e.teacher_name} · {e.grade} {e.class_name}
                    </span>
                    <span>
                      {DAYS[e.day]} · {e.start_time}–{e.end_time}
                    </span>
                  </div>
                  <i style={{ background: e.school_color }} />
                </button>
              ))}
            </div>
          ) : (
            <Empty title="No upcoming sessions">Add sessions to start planning your week.</Empty>
          )}
        </section>
      </div>
      <div className="dashboard-grid breakdown-grid">
        <BreakdownPanel title="Sessions by school" items={data.by_school} />
        <BreakdownPanel title="Sessions by teacher" items={data.by_teacher} />
      </div>
      <div className="dashboard-foot">
        <span>
          <ShieldCheck size={16} /> All schedules are shared with your authorized team.
        </span>
        <span>Times in {data.timezone}</span>
      </div>
    </>
  );
}
function BreakdownPanel({ title, items }: { title: string; items: Dashboard["by_school"] }) {
  const max = Math.max(1, ...items.map((x) => x.sessions));
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <span className="muted">Weekly</span>
      </div>
      {items.length ? (
        <div className="breakdowns">
          {[...items]
            .sort((a, b) => b.sessions - a.sessions)
            .map((x) => (
              <div key={x.id} className="breakdown-row">
                <div className="row-between">
                  <span>{x.name}</span>
                  <strong>
                    {x.sessions} <small>sessions</small>
                  </strong>
                </div>
                <div className="bar-track">
                  <div
                    style={{
                      width: `${(x.sessions / max) * 100}%`,
                      background: x.color,
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      ) : (
        <Empty title="No sessions yet" />
      )}
    </section>
  );
}
