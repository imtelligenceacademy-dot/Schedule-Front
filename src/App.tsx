import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  LayoutDashboard,
  CalendarDays,
  School as SchoolIcon,
  UsersRound,
  TriangleAlert,
  Upload,
  Users,
  History,
  Settings,
  RefreshCw,
  Plus,
  Download,
  Search,
  ArrowUpRight,
  Clock3,
  LogOut,
  ChevronRight,
  Check,
  Pencil,
  KeyRound,
  Menu,
  ShieldCheck,
  Loader2,
  CalendarRange,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import { api, download, setAccessToken, setCsrf } from "./api";
import {
  Brand,
  DAYS,
  Empty,
  ErrorBox,
  Field,
  Form,
  Modal,
  Text,
  datetime,
  initials,
} from "./components";
import type {
  Audit,
  Catalog,
  Conflict,
  Dashboard,
  Entry,
  ImportResult,
  School,
  Teacher,
  User,
} from "./types";

type Page =
  | "Dashboard"
  | "All Schedules"
  | "Schools"
  | "Teachers"
  | "Conflicts"
  | "Data Import"
  | "Users"
  | "Audit Log"
  | "Settings";
const NAV = [
  { page: "Dashboard", icon: LayoutDashboard },
  { page: "All Schedules", icon: CalendarDays },
  { page: "Schools", icon: SchoolIcon },
  { page: "Teachers", icon: UsersRound },
  { page: "Conflicts", icon: TriangleAlert },
  { page: "Data Import", icon: Upload },
  { page: "Users", icon: Users },
  { page: "Audit Log", icon: History },
  { page: "Settings", icon: Settings },
] as const;
const SUBTITLES: Record<Page, string> = {
  Dashboard: "Your robotics week, at a glance.",
  "All Schedules": "One shared schedule for every school and teacher.",
  Schools: "Schools, classes and their assigned teachers.",
  Teachers: "Teaching teams and academic year assignments.",
  Conflicts: "Review overlapping teacher and class sessions.",
  "Data Import": "Validate a spreadsheet before adding sessions.",
  Users: "Manage access to your shared workspace.",
  "Audit Log": "See who changed what, and when.",
  Settings: "Manage academic years and archived schedules.",
};
const EMPTY_CATALOG: Catalog = {
  schools: [],
  teachers: [],
  classes: [],
  assignments: [],
  academic_years: [],
};
type Filter = {
  school_id: string;
  teacher_id: string;
  day: string;
  grade: string;
  class_id: string;
  search: string;
};
const CLEAR: Filter = {
  school_id: "",
  teacher_id: "",
  day: "",
  grade: "",
  class_id: "",
  search: "",
};
type Auth = { user: User; csrf_token: string; access_token?: string };

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

function Login({ onAuth, expired }: { onAuth: (x: Auth) => void; expired: boolean }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      onAuth(
        await api<Auth>("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: f.get("email"),
            password: f.get("password"),
          }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <section className="login-story">
        <Brand />
        <div className="story-content">
          <span className="eyebrow">THE TEAM BEHIND THE TIMETABLE</span>
          <h1>
            Every school.
            <br />
            Every teacher.
            <br />
            <em>In sync.</em>
          </h1>
          <p>A shared workspace for the people bringing robotics into the classroom.</p>
          <div className="login-rule">
            <ShieldCheck size={22} />
            <div>
              <strong>One team. One schedule.</strong>
              <span>Secure access for authorized staff.</span>
            </div>
          </div>
        </div>
        <span className="story-footer">IM-Telligence · Robotics education</span>
      </section>
      <section className="login-form">
        <div className="login-card">
          <div className="mobile-brand">
            <Brand />
          </div>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Robotics Schedule Manager</h2>
          <p>Sign in to your team’s workspace.</p>
          {expired && <div className="notice">Your session ended. Sign in again to continue.</div>}
          <form onSubmit={submit}>
            <Field label="Email">
              <input
                name="email"
                type="email"
                placeholder="you@im-telligence.com"
                required
                autoComplete="username"
              />
            </Field>
            <Field label="Password">
              <input
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                maxLength={256}
              />
            </Field>
            <ErrorBox error={error} />
            <button className="button primary login-submit" disabled={busy}>
              {busy ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <>
                  Sign In <ArrowUpRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className="login-help">
            <KeyRound size={16} />
            <span>Need access or a password reset? Contact your Super Admin.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function PasswordPage({ user, onAuth }: { user: User; onAuth: (x: Auth) => void }) {
  return (
    <div className="password-page">
      <div className="password-card">
        <Brand />
        <h1>Choose your password</h1>
        <p>Hello {user.full_name}. Replace your temporary password to open the workspace.</p>
        <PasswordForm onAuth={onAuth} onClose={() => {}} forced />
      </div>
    </div>
  );
}
function PasswordForm({
  onAuth,
  onClose,
  forced = false,
}: {
  onAuth: (x: Auth) => void;
  onClose: () => void;
  forced?: boolean;
}) {
  return (
    <Form
      onCancel={onClose}
      label="Change password"
      onSave={async (f) => {
        if (f.get("new_password") !== f.get("confirm"))
          throw new Error("New passwords do not match.");
        const auth = await api<Auth>("/auth/password", {
          method: "POST",
          body: JSON.stringify({
            current_password: f.get("current_password"),
            new_password: f.get("new_password"),
          }),
        });
        onAuth(auth);
        onClose();
      }}
    >
      <Field label={forced ? "Temporary password" : "Current password"}>
        <input
          type="password"
          name="current_password"
          autoComplete="current-password"
          required
          maxLength={256}
        />
      </Field>
      <Field label="New password · at least 12 characters">
        <Text name="new_password" type="password" minLength={12} maxLength={256} />
      </Field>
      <Field label="Confirm new password">
        <Text name="confirm" type="password" minLength={12} maxLength={256} />
      </Field>
    </Form>
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
    if (value) query.set(key, value);
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
  function guardAction(fn: () => Promise<void>) {
    void fn().catch((e) => setError((e as Error).message));
  }
  const allowed = (name: Page) =>
    !(["Users", "Audit Log", "Settings"].includes(name) && !isSuper) &&
    !(name === "Data Import" && !canEdit);
  const visiblePage = allowed(page) ? page : "Dashboard";
  const updateFilter = (name: keyof Filter, value: string) =>
    setFilter((f) => ({ ...f, [name]: value }));
  function schoolForm(school?: School) {
    setModal(
      <Modal title={school ? "Edit school" : "Add school"} onClose={() => setModal(null)}>
        <Form
          onCancel={() => setModal(null)}
          onSave={async (f) => {
            await api(`/schools${school ? "/" + school.id : ""}`, {
              method: school ? "PUT" : "POST",
              body: JSON.stringify({
                name: f.get("name"),
                color: f.get("color"),
                active: f.get("active") === "on",
              }),
            });
            await saved();
          }}
        >
          <Field label="School name">
            <Text name="name" value={school?.name} maxLength={150} />
          </Field>
          <Field label="Schedule color">
            <input name="color" type="color" defaultValue={school?.color || "#2563eb"} required />
          </Field>
          <label className="check-label">
            <input name="active" type="checkbox" defaultChecked={school?.active ?? true} /> Active
            school
          </label>
        </Form>
      </Modal>,
    );
  }
  function teacherForm(teacher?: Teacher) {
    setModal(
      <Modal title={teacher ? "Edit teacher" : "Add teacher"} onClose={() => setModal(null)}>
        <Form
          onCancel={() => setModal(null)}
          onSave={async (f) => {
            await api(`/teachers${teacher ? "/" + teacher.id : ""}`, {
              method: teacher ? "PUT" : "POST",
              body: JSON.stringify({
                full_name: f.get("full_name"),
                email: f.get("email") || null,
                active: f.get("active") === "on",
              }),
            });
            await saved();
          }}
        >
          <Field label="Full name">
            <Text name="full_name" value={teacher?.full_name} maxLength={120} />
          </Field>
          <Field label="Email (optional)">
            <Text
              name="email"
              value={teacher?.email || ""}
              type="email"
              required={false}
              maxLength={254}
            />
          </Field>
          <label className="check-label">
            <input name="active" type="checkbox" defaultChecked={teacher?.active ?? true} /> Active
            teacher
          </label>
        </Form>
      </Modal>,
    );
  }
  function classForm(schoolId: number) {
    setModal(
      <Modal title="Add class" onClose={() => setModal(null)}>
        <Form
          onCancel={() => setModal(null)}
          onSave={async (f) => {
            await api("/classes", {
              method: "POST",
              body: JSON.stringify({
                school_id: schoolId,
                grade: f.get("grade"),
                name: f.get("name"),
              }),
            });
            await saved();
          }}
        >
          <Field label="Grade">
            <Text name="grade" maxLength={30} />
          </Field>
          <Field label="Class / section">
            <Text name="name" maxLength={50} />
          </Field>
        </Form>
      </Modal>,
    );
  }
  function assignmentForm(teacher?: Teacher) {
    setModal(
      <Modal
        title="Assign teacher to school"
        description={`One school per teacher for ${selectedYear?.name}.`}
        onClose={() => setModal(null)}
      >
        <Form
          onCancel={() => setModal(null)}
          onSave={async (f) => {
            await api("/assignments", {
              method: "POST",
              body: JSON.stringify({
                teacher_id: Number(f.get("teacher_id")),
                school_id: Number(f.get("school_id")),
                academic_year_id: Number(yearId),
              }),
            });
            await saved();
          }}
        >
          <Field label="Teacher">
            <select name="teacher_id" defaultValue={teacher?.id || ""} required>
              <option value="">Select a teacher</option>
              {catalog.teachers
                .filter((x) => x.active)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.full_name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="School">
            <select name="school_id" required defaultValue="">
              <option value="">Select a school</option>
              {catalog.schools
                .filter((x) => x.active)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </Field>
          <div className="notice">
            A school can have multiple teachers. Existing sessions must be removed before
            reassigning a teacher.
          </div>
        </Form>
      </Modal>,
    );
  }
  function confirmAction(title: string, description: string, fn: () => Promise<void>) {
    setModal(
      <Modal title={title} description={description} onClose={() => setModal(null)}>
        <Form
          onCancel={() => setModal(null)}
          label="Confirm"
          onSave={async () => {
            await fn();
            await saved();
          }}
        >
          <p>{description}</p>
        </Form>
      </Modal>,
    );
  }
  function userForm(account?: User) {
    setModal(
      <Modal title={account ? "Edit user" : "Create user"} onClose={() => setModal(null)}>
        <Form
          onCancel={() => setModal(null)}
          label={account ? "Save changes" : "Create user"}
          onSave={async (f) => {
            const body = {
              full_name: f.get("full_name"),
              role: f.get("role"),
              export_allowed: f.get("export_allowed") === "on",
              ...(account
                ? { active: f.get("active") === "on" }
                : {
                    email: f.get("email"),
                    temporary_password: f.get("temporary_password"),
                  }),
            };
            await api(`/users${account ? "/" + account.id : ""}`, {
              method: account ? "PUT" : "POST",
              body: JSON.stringify(body),
            });
            await saved();
          }}
        >
          <Field label="Full name">
            <Text name="full_name" value={account?.full_name} maxLength={120} />
          </Field>
          {!account && (
            <>
              <Field label="Email">
                <Text name="email" type="email" maxLength={254} />
              </Field>
              <Field label="Temporary password · at least 12 characters">
                <Text name="temporary_password" type="password" minLength={12} maxLength={256} />
              </Field>
              <div className="notice">
                Share this password securely. The user must replace it on first sign-in.
              </div>
            </>
          )}
          <Field label="Role">
            <select name="role" defaultValue={account?.role || "VIEWER"}>
              <option value="VIEWER">Viewer</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </Field>
          <label className="check-label">
            <input type="checkbox" name="export_allowed" defaultChecked={account?.export_allowed} />{" "}
            Allow exports for Viewer
          </label>
          {account && (
            <label className="check-label">
              <input type="checkbox" name="active" defaultChecked={account.active} /> Active account
            </label>
          )}
        </Form>
      </Modal>,
    );
  }
  function resetPassword(account: User) {
    setModal(
      <Modal title={`Reset password for ${account.full_name}`} onClose={() => setModal(null)}>
        <Form
          onCancel={() => setModal(null)}
          label="Reset password"
          onSave={async (f) => {
            await api(`/users/${account.id}/reset-password`, {
              method: "POST",
              body: JSON.stringify({
                temporary_password: f.get("temporary_password"),
              }),
            });
            await saved();
          }}
        >
          <Field label="New temporary password · at least 12 characters">
            <Text name="temporary_password" type="password" minLength={12} maxLength={256} />
          </Field>
          <div className="notice">
            This ends their existing sessions and requires a password change on next sign-in.
          </div>
        </Form>
      </Modal>,
    );
  }
  function yearForm() {
    setModal(
      <Modal title="Add academic year" onClose={() => setModal(null)}>
        <Form
          onCancel={() => setModal(null)}
          onSave={async (f) => {
            await api("/years", {
              method: "POST",
              body: JSON.stringify({
                name: f.get("name"),
                start_date: f.get("start_date"),
                end_date: f.get("end_date"),
              }),
            });
            await saved();
          }}
        >
          <Field label="Academic year name">
            <Text name="name" maxLength={40} />
          </Field>
          <div className="form-grid">
            <Field label="Start date">
              <Text name="start_date" type="date" />
            </Field>
            <Field label="End date">
              <Text name="end_date" type="date" />
            </Field>
          </div>
        </Form>
      </Modal>,
    );
  }
  const contextAssignments = catalog.assignments.filter(
    (x) => String(x.academic_year_id) === yearId,
  );
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
                <button className="button primary" onClick={() => schoolForm()}>
                  <Plus size={17} /> Add school
                </button>
              )}
              {visiblePage === "Teachers" && isSuper && (
                <button className="button primary" onClick={() => teacherForm()}>
                  <Plus size={17} /> Add teacher
                </button>
              )}
              {visiblePage === "Users" && isSuper && (
                <button className="button primary" onClick={() => userForm()}>
                  <Plus size={17} /> Create user
                </button>
              )}
              {visiblePage === "Settings" && isSuper && (
                <button className="button primary" onClick={yearForm}>
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
                      <button className="button primary" onClick={yearForm}>
                        Add academic year
                      </button>
                    ) : (
                      "Ask your Super Admin to create an academic year."
                    )}
                  </Empty>
                ))}
              {visiblePage === "All Schedules" && (
                <>
                  <div className="filter-panel">
                    <div className="search-input">
                      <Search size={17} />
                      <input
                        aria-label="Search schedules"
                        placeholder="Search school, teacher, class…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <select
                      aria-label="Filter by school"
                      value={filter.school_id}
                      onChange={(e) => updateFilter("school_id", e.target.value)}
                    >
                      <option value="">All schools</option>
                      {catalog.schools.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by teacher"
                      value={filter.teacher_id}
                      onChange={(e) => updateFilter("teacher_id", e.target.value)}
                    >
                      <option value="">All teachers</option>
                      {catalog.teachers.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.full_name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by day"
                      value={filter.day}
                      onChange={(e) => updateFilter("day", e.target.value)}
                    >
                      <option value="">All days</option>
                      {DAYS.map((x, i) => (
                        <option key={x} value={i}>
                          {x}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by grade"
                      value={filter.grade}
                      onChange={(e) => updateFilter("grade", e.target.value)}
                    >
                      <option value="">All grades</option>
                      {[...new Set(catalog.classes.map((x) => x.grade))].sort().map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by class"
                      value={filter.class_id}
                      onChange={(e) => updateFilter("class_id", e.target.value)}
                    >
                      <option value="">All classes</option>
                      {catalog.classes
                        .filter(
                          (x) => !filter.school_id || String(x.school_id) === filter.school_id,
                        )
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.grade} · {x.name}
                          </option>
                        ))}
                    </select>
                    {Object.values(filter).some(Boolean) && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setFilter(CLEAR);
                          setSearch("");
                        }}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                  <ScheduleView
                    entries={entries}
                    onEntry={showSession}
                    catalog={catalog}
                    conflicts={conflictList}
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
                <>
                  {catalog.schools.length ? (
                    <div className="school-grid">
                      {catalog.schools.map((s) => {
                        const assigned = contextAssignments.filter((a) => a.school_id === s.id);
                        const classList = catalog.classes.filter((c) => c.school_id === s.id);
                        return (
                          <article
                            className="school-card"
                            key={s.id}
                            style={{ borderTopColor: s.color }}
                          >
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
                                  onClick={() => schoolForm(s)}
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
                                      <span className="mini-avatar">
                                        {initials(t?.full_name || "?")}
                                      </span>
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
                                <button className="text-button" onClick={() => classForm(s.id)}>
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
                                onClick={() => assignmentForm()}
                              >
                                <Plus size={16} /> Assign teacher
                              </button>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <Empty title="No schools yet">
                      Add the schools your robotics team works with.
                    </Empty>
                  )}
                </>
              )}
              {visiblePage === "Teachers" && (
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
                                    <button
                                      className="text-button"
                                      onClick={() => {
                                        setFilter({
                                          ...CLEAR,
                                          teacher_id: String(t.id),
                                        });
                                        setSearch("");
                                        navigate("All Schedules");
                                      }}
                                    >
                                      Schedule <ArrowUpRight size={14} />
                                    </button>
                                    {isSuper && (
                                      <>
                                        <button
                                          className="icon-button"
                                          title="Edit teacher"
                                          aria-label={`Edit ${t.full_name}`}
                                          onClick={() => teacherForm(t)}
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
                                              onClick={() => assignmentForm(t)}
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
                    <ShieldCheck size={17} /> One teacher is assigned to one school per academic
                    year. A school can have multiple teachers.
                  </div>
                </div>
              )}
              {visiblePage === "Conflicts" && (
                <div className="panel">
                  <div className="panel-head">
                    <h2>
                      {conflictList.length} {conflictList.length === 1 ? "conflict" : "conflicts"}{" "}
                      to review
                    </h2>
                    <span className={`badge ${conflictList.length ? "orange" : "green"}`}>
                      {conflictList.length ? "Needs attention" : "All clear"}
                    </span>
                  </div>
                  {conflictList.length ? (
                    <div className="conflict-list">
                      {conflictList.map((c) => (
                        <article className="conflict-card" key={c.id}>
                          <div className="conflict-title">
                            <TriangleAlert size={19} />
                            <strong>{c.types.join(" & ")}</strong>
                            <span>{DAYS[c.first.day]}</span>
                          </div>
                          <div className="conflict-pair">
                            {[c.first, c.second].map((e) => (
                              <button
                                key={e.id}
                                onClick={() => showSession(e)}
                                className="conflict-entry"
                              >
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
                                  {writable ? "Review & edit" : "View session"}{" "}
                                  <ArrowUpRight size={14} />
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
              )}
              {visiblePage === "Data Import" && canEdit && (
                <ImportView
                  yearId={yearId}
                  archived={!!selectedYear?.archived}
                  onSaved={async () => {
                    setNotice("Schedule imported.");
                    await load();
                  }}
                />
              )}
              {visiblePage === "Users" && isSuper && (
                <div className="panel">
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Last sign-in</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userList.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <div className="person">
                                <div className="avatar light">{initials(u.full_name)}</div>
                                <div>
                                  <strong>
                                    {u.full_name}
                                    {u.id === user.id ? " (you)" : ""}
                                  </strong>
                                  <span>{u.email}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge gray">{u.role.replaceAll("_", " ")}</span>
                            </td>
                            <td>
                              <span className={`badge ${u.active ? "green" : "gray"}`}>
                                {u.active ? "Active" : "Disabled"}
                              </span>
                            </td>
                            <td>{u.last_login ? datetime(u.last_login) : "Never"}</td>
                            <td>
                              <div className="table-actions">
                                <button className="text-button" onClick={() => userForm(u)}>
                                  Edit
                                </button>
                                {u.id !== user.id && (
                                  <>
                                    <button
                                      className="text-button"
                                      onClick={() => resetPassword(u)}
                                    >
                                      Reset password
                                    </button>
                                    <button
                                      className={`text-button ${u.active ? "danger" : ""}`}
                                      onClick={() =>
                                        confirmAction(
                                          u.active ? "Disable user" : "Enable user",
                                          `${u.active ? "Disable" : "Enable"} access for ${u.full_name}?`,
                                          async () => {
                                            await api(`/users/${u.id}`, {
                                              method: "PUT",
                                              body: JSON.stringify({
                                                full_name: u.full_name,
                                                role: u.role,
                                                active: !u.active,
                                                export_allowed: u.export_allowed,
                                              }),
                                            });
                                          },
                                        )
                                      }
                                    >
                                      {u.active ? "Disable" : "Enable"}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="panel-note">
                    <ShieldCheck size={17} /> Viewers can browse schedules. Admins can edit and
                    import. Super Admins manage people and configuration.
                  </div>
                </div>
              )}
              {visiblePage === "Audit Log" && isSuper && (
                <div className="panel">
                  <div className="panel-head">
                    <h2>Workspace activity</h2>
                    <span className="muted">{auditData.total} events</span>
                  </div>
                  {auditData.items.map((a) => (
                    <div className="audit-row" key={a.id}>
                      <div className="avatar light">{initials(a.user_name)}</div>
                      <div>
                        <strong>{a.user_name}</strong>
                        <p>
                          {a.action.replaceAll("_", " ")} · {a.entity_type.replaceAll("_", " ")} #
                          {a.entity_id}
                        </p>
                        <details>
                          <summary>View changes</summary>
                          <div className="audit-values">
                            <pre>{JSON.stringify(a.old_value, null, 2)}</pre>
                            <pre>{JSON.stringify(a.new_value, null, 2)}</pre>
                          </div>
                        </details>
                      </div>
                      <time>{datetime(a.timestamp)}</time>
                    </div>
                  ))}
                  {!auditData.items.length && <Empty title="No activity yet" />}
                  <div className="pagination">
                    <button
                      className="button secondary"
                      disabled={!auditPage}
                      onClick={() => setAuditPage((x) => x - 1)}
                    >
                      Previous
                    </button>
                    <span>Page {auditPage + 1}</span>
                    <button
                      className="button secondary"
                      disabled={(auditPage + 1) * 50 >= auditData.total}
                      onClick={() => setAuditPage((x) => x + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              {visiblePage === "Settings" && isSuper && (
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
                                        "Change current academic year",
                                        `Make ${y.name} the current academic year? Previous schedules and assignments will be preserved.`,
                                        async () => {
                                          await api(`/years/${y.id}/activate`, {
                                            method: "POST",
                                          });
                                          setYearId(String(y.id));
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
                    <History size={17} /> Archived years stay accessible. Teacher assignments are
                    specific to each academic year.
                  </div>
                </div>
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

function DashboardView({
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

function ScheduleView({
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

function SessionModal({
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

function ImportView({
  yearId,
  archived,
  onSaved,
}: {
  yearId: string;
  archived: boolean;
  onSaved: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null),
    [result, setResult] = useState<ImportResult | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
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
      const r = await api<ImportResult>(`/import?academic_year_id=${yearId}&dry_run=${dryRun}`, {
        method: "POST",
        body,
      });
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
          <li>Add schools and teachers.</li>
          <li>Assign each teacher to one school for the selected year.</li>
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
          Optional: notes. Use weekday names and times like 08:00. Excel files use the first
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
