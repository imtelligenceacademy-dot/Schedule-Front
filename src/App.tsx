import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  RefreshCw,
  Plus,
  LogOut,
  ChevronRight,
  Check,
  KeyRound,
  Menu,
  Loader2,
  History,
} from "lucide-react";
import { api, download, setAccessToken, setCsrf } from "./api";
import { Brand, Empty, ErrorBox, Modal, initials } from "./components";
import { schoolForm, teacherForm, userForm, yearForm } from "./forms";
import { SessionModal } from "./SessionModal";
import { AuditLogView } from "./pages/AuditLogView";
import { ConflictsView } from "./pages/ConflictsView";
import { DashboardView } from "./pages/DashboardView";
import { ImportView } from "./pages/ImportView";
import { Login, PasswordForm, PasswordPage } from "./pages/Login";
import { ScheduleFilters } from "./pages/ScheduleFilters";
import { ScheduleView } from "./pages/ScheduleView";
import { SchoolsView } from "./pages/SchoolsView";
import { SettingsView } from "./pages/SettingsView";
import { TeachersView } from "./pages/TeachersView";
import { UsersView } from "./pages/UsersView";
import type { Audit, Catalog, Conflict, Dashboard, Entry, User } from "./types";
import {
  CLEAR,
  EMPTY_CATALOG,
  NAV,
  SUBTITLES,
  type Auth,
  type Filter,
  type ListFilter,
  type ModalHost,
  type Page,
} from "./workspace";

export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [expired, setExpired] = useState(false);
  const [cold, setCold] = useState(false),
    [bootError, setBootError] = useState(""),
    [retry, setRetry] = useState(0);
  const accept = (auth: Auth) => {
    setCsrf(auth.csrf_token);
    if (auth.access_token) setAccessToken(auth.access_token);
    setUser(auth.user);
    setExpired(false);
  };
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setBootError("");
    setCold(false);
    const timer = setTimeout(() => setCold(true), 5000);
    api<Auth>("/auth/me")
      .then((x) => {
        if (alive) accept(x);
      })
      .catch((e) => {
        if (alive) {
          if (e.status === 401) setAccessToken("");
          else setBootError(e.message);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
        clearTimeout(timer);
      });
    const expire = () => {
      setUser(null);
      setCsrf("");
      setAccessToken("");
      setExpired(true);
    };
    window.addEventListener("session-expired", expire);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener("session-expired", expire);
    };
  }, [retry]);
  if (loading || bootError)
    return (
      <div className="boot">
        <Brand />
        {loading ? (
          <>
            <Loader2 className="spin" />
            <p>{cold ? "Starting schedule server..." : "Opening your workspace…"}</p>
            {cold && (
              <span className="muted">The server is waking up. This can take about a minute.</span>
            )}
          </>
        ) : (
          <>
            <ErrorBox error={bootError} />
            <button className="button primary" onClick={() => setRetry((x) => x + 1)}>
              Try again
            </button>
          </>
        )}
      </div>
    );
  if (!user) return <Login onAuth={accept} expired={expired} />;
  if (user.must_change_password) return <PasswordPage user={user} onAuth={accept} />;
  return (
    <Workspace
      user={user}
      onAuth={accept}
      onLogout={() => {
        setUser(null);
        setCsrf("");
        setAccessToken("");
      }}
    />
  );
}

function Workspace({
  user,
  onLogout,
  onAuth,
}: {
  user: User;
  onLogout: () => void;
  onAuth: (x: Auth) => void;
}) {
  const routeFromHash = () =>
    NAV.find((x) => x.page.toLowerCase().replaceAll(" ", "-") === window.location.hash.slice(1))
      ?.page || "Dashboard";
  const [page, setPage] = useState<Page>(routeFromHash),
    [catalog, setCatalog] = useState<Catalog>(EMPTY_CATALOG),
    [yearId, setYearId] = useState(""),
    [filter, setFilter] = useState<Filter>(CLEAR),
    [search, setSearch] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]),
    [dash, setDash] = useState<Dashboard | null>(null),
    [conflictList, setConflicts] = useState<Conflict[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [session, setSession] = useState<Entry | true | null>(null),
    [modal, setModal] = useState<ReactNode>(null),
    [mobile, setMobile] = useState(false);
  const [userList, setUserList] = useState<User[]>([]),
    [auditData, setAuditData] = useState<{ items: Audit[]; total: number }>({
      items: [],
      total: 0,
    }),
    [auditPage, setAuditPage] = useState(0);
  const generation = useRef(0),
    yearRef = useRef(yearId);
  yearRef.current = yearId;
  const isSuper = user.role === "SUPER_ADMIN",
    canEdit = user.role !== "VIEWER",
    canExport = canEdit || user.export_allowed;
  const selectedYear = catalog.academic_years.find((x) => String(x.id) === yearId);
  const writable = canEdit && !selectedYear?.archived;
  const query = new URLSearchParams({ academic_year_id: yearId });
  Object.entries(filter).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((x) => query.append(key, x));
    else if (value) query.set(key, value);
  });
  const queryText = query.toString();
  useEffect(() => {
    const t = setTimeout(() => setFilter((f) => ({ ...f, search })), 300);
    return () => clearTimeout(t);
  }, [search]);
  const load = useCallback(async () => {
    const id = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const data = await api<Catalog>("/catalog");
      if (id !== generation.current) return;
      setCatalog(data);
      const chosen =
        yearRef.current ||
        String(data.academic_years.find((x) => x.active)?.id || data.academic_years[0]?.id || "");
      if (!chosen) {
        setDash(null);
        setEntries([]);
        setConflicts([]);
        setLastRefresh(new Date());
        return;
      }
      if (!yearRef.current) {
        setYearId(chosen);
        return;
      }
      const [loadedEntries, loadedDash, loadedConflicts] = await Promise.all([
        api<Entry[]>(`/sessions?${queryText}`),
        api<Dashboard>(`/dashboard?academic_year_id=${chosen}`),
        api<Conflict[]>(`/conflicts?academic_year_id=${chosen}`),
      ]);
      if (id !== generation.current) return;
      setEntries(loadedEntries);
      setDash(loadedDash);
      setConflicts(loadedConflicts);
      setLastRefresh(new Date());
      if (isSuper && page === "Users") {
        const users = await api<User[]>("/users");
        if (id === generation.current) setUserList(users);
      }
      if (isSuper && page === "Audit Log") {
        const events = await api<{ items: Audit[]; total: number }>(
          `/audit?offset=${auditPage * 50}`,
        );
        if (id === generation.current) setAuditData(events);
      }
    } catch (e) {
      if (id === generation.current) setError((e as Error).message);
    } finally {
      if (id === generation.current) setBusy(false);
    }
  }, [queryText, page, isSuper, auditPage]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 45000);
    return () => {
      clearInterval(timer);
      generation.current++;
    };
  }, [load]);
  useEffect(() => {
    const listener = () => setPage(routeFromHash());
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 6000);
      return () => clearTimeout(t);
    }
  }, [notice]);
  function navigate(next: Page) {
    setPage(next);
    window.location.hash = next.toLowerCase().replaceAll(" ", "-");
    setMobile(false);
  }
  async function saved(message = "Changes saved.") {
    setModal(null);
    setSession(null);
    setNotice(message);
    await load();
  }
  const host: ModalHost = { setModal, saved };
  function guardAction(fn: () => Promise<void>) {
    void fn().catch((e) => setError((e as Error).message));
  }
  const allowed = (name: Page) =>
    !(["Users", "Audit Log", "Settings"].includes(name) && !isSuper) &&
    !(name === "Data Import" && !canEdit);
  const visiblePage = allowed(page) ? page : "Dashboard";
  const updateFilter = (name: ListFilter, value: string[]) =>
    setFilter((f) => ({ ...f, [name]: value }));
  function showSession(entry: Entry) {
    setSession(entry);
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Brand />
        <div className="workspace-label">SCHEDULE WORKSPACE</div>
        <nav aria-label="Main navigation">
          {NAV.filter((x) => allowed(x.page)).map(({ page: next, icon: Icon }) => (
            <button
              key={next}
              onClick={() => navigate(next)}
              className={`nav-item ${visiblePage === next ? "selected" : ""}`}
            >
              <Icon size={19} />
              <span>{next}</span>
              {next === "Conflicts" && conflictList.length > 0 && (
                <b className="nav-count">{conflictList.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="shared-status">
            <span /> Shared workspace
          </div>
          <div className="user-info">
            <div className="avatar">{initials(user.full_name)}</div>
            <div>
              <strong>{user.full_name}</strong>
              <span>{user.role.replaceAll("_", " ").toLowerCase()}</span>
            </div>
            <button
              className="icon-button"
              title="Sign out"
              aria-label="Sign out"
              onClick={() =>
                guardAction(async () => {
                  await api("/auth/logout", { method: "POST" });
                  onLogout();
                })
              }
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={15} />
            <strong>{visiblePage}</strong>
          </div>
          <div className="topbar-right">
            <span className="year-label">ACADEMIC YEAR</span>
            <select
              aria-label="Academic year"
              value={yearId}
              onChange={(e) => {
                setYearId(e.target.value);
                setFilter(CLEAR);
                setSearch("");
              }}
            >
              {!catalog.academic_years.length && <option value="">No academic year</option>}
              {catalog.academic_years.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                  {x.archived ? " · Archived" : ""}
                </option>
              ))}
            </select>
            <button
              className="icon-button"
              title="Change password"
              aria-label="Change password"
              onClick={() =>
                setModal(
                  <Modal title="Change your password" onClose={() => setModal(null)}>
                    <PasswordForm onAuth={onAuth} onClose={() => setModal(null)} />
                  </Modal>,
                )
              }
            >
              <KeyRound size={18} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="page-kicker">IM-TELLIGENCE / ROBOTICS</div>
              <h1>{visiblePage}</h1>
              <p>{SUBTITLES[visiblePage]}</p>
            </div>
            <div className="heading-actions">
              <button className="button secondary" onClick={() => void load()} disabled={busy}>
                <RefreshCw size={16} className={busy ? "spin" : ""} /> Refresh
              </button>
              {visiblePage === "All Schedules" && writable && (
                <button
                  className="button primary"
                  onClick={() => setSession(true)}
                  disabled={!yearId}
                >
                  <Plus size={17} /> Add session
                </button>
              )}
              {visiblePage === "Schools" && isSuper && (
                <button className="button primary" onClick={() => schoolForm(host)}>
                  <Plus size={17} /> Add school
                </button>
              )}
              {visiblePage === "Teachers" && isSuper && (
                <button className="button primary" onClick={() => teacherForm(host)}>
                  <Plus size={17} /> Add teacher
                </button>
              )}
              {visiblePage === "Users" && isSuper && (
                <button className="button primary" onClick={() => userForm(host)}>
                  <Plus size={17} /> Create user
                </button>
              )}
              {visiblePage === "Settings" && isSuper && (
                <button className="button primary" onClick={() => yearForm(host)}>
                  <Plus size={17} /> Add year
                </button>
              )}
            </div>
          </div>
          <ErrorBox error={error} />
          {notice && (
            <div className="toast" role="status">
              <Check size={17} />
              {notice}
            </div>
          )}
          {selectedYear?.archived && (
            <div className="notice">
              <History size={17} /> {selectedYear.name} is archived. Schedules are available for
              viewing and permitted exports.
            </div>
          )}
          {!lastRefresh && busy ? (
            <div className="loading-surface">
              <Loader2 className="spin" />
              <p>Loading shared schedules…</p>
            </div>
          ) : (
            <>
              {visiblePage === "Dashboard" &&
                (dash ? (
                  <DashboardView data={dash} onEntry={showSession} navigate={navigate} />
                ) : (
                  <Empty title="Set up your academic year">
                    {isSuper ? (
                      <button className="button primary" onClick={() => yearForm(host)}>
                        Add academic year
                      </button>
                    ) : (
                      "Ask your Super Admin to create an academic year."
                    )}
                  </Empty>
                ))}
              {visiblePage === "All Schedules" && (
                <>
                  <ScheduleFilters
                    catalog={catalog}
                    filter={filter}
                    search={search}
                    onSearch={setSearch}
                    onFilter={updateFilter}
                    onClear={() => {
                      setFilter(CLEAR);
                      setSearch("");
                    }}
                  />
                  <ScheduleView
                    entries={entries}
                    onEntry={showSession}
                    catalog={catalog}
                    conflicts={conflictList}
                    compareTeachers={
                      filter.teacher_id.length > 1 ? filter.teacher_id.map(Number) : []
                    }
                    canExport={canExport}
                    onRefresh={() => void load()}
                    onExport={(fmt) =>
                      guardAction(async () => {
                        await download(
                          `/export?${queryText}&format=${fmt}`,
                          `robotics-schedule.${fmt}`,
                        );
                      })
                    }
                  />
                </>
              )}
              {visiblePage === "Schools" && (
                <SchoolsView
                  catalog={catalog}
                  yearId={yearId}
                  selectedYear={selectedYear}
                  isSuper={isSuper}
                  canEdit={canEdit}
                  host={host}
                />
              )}
              {visiblePage === "Teachers" && (
                <TeachersView
                  catalog={catalog}
                  yearId={yearId}
                  selectedYear={selectedYear}
                  isSuper={isSuper}
                  host={host}
                  onViewSchedule={(teacherId) => {
                    setFilter({ ...CLEAR, teacher_id: [String(teacherId)] });
                    setSearch("");
                    navigate("All Schedules");
                  }}
                />
              )}
              {visiblePage === "Conflicts" && (
                <ConflictsView conflicts={conflictList} writable={writable} onEntry={showSession} />
              )}
              {visiblePage === "Data Import" && canEdit && (
                <ImportView
                  yearId={yearId}
                  isSuper={isSuper}
                  archived={!!selectedYear?.archived}
                  onSaved={async () => {
                    setNotice("Schedule imported.");
                    await load();
                  }}
                />
              )}
              {visiblePage === "Users" && isSuper && (
                <UsersView users={userList} currentUser={user} host={host} />
              )}
              {visiblePage === "Audit Log" && isSuper && (
                <AuditLogView data={auditData} page={auditPage} setPage={setAuditPage} />
              )}
              {visiblePage === "Settings" && isSuper && (
                <SettingsView catalog={catalog} host={host} onActivated={setYearId} />
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>
              <span className="live-dot" /> Central database · Auto-refresh every 45 seconds
            </span>
            <span>
              {lastRefresh
                ? `Refreshed ${lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </span>
          </footer>
        </main>
      </div>
      {session && (
        <SessionModal
          key={session === true ? "new" : session.id}
          entry={session === true ? undefined : session}
          catalog={catalog}
          yearId={Number(yearId)}
          writable={writable}
          isSuper={isSuper}
          onClose={() => setSession(null)}
          onSaved={saved}
        />
      )}
      {modal}
    </div>
  );
}
