import { api } from "./api";
import { Field, Form, Modal, Text } from "./components";
import type { Catalog, School, Teacher, User } from "./types";
import type { ModalHost } from "./workspace";

export function schoolForm({ setModal, saved }: ModalHost, school?: School) {
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

export function teacherForm({ setModal, saved }: ModalHost, teacher?: Teacher) {
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

export function classForm({ setModal, saved }: ModalHost, schoolId: number) {
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

export function assignmentForm(
  { setModal, saved }: ModalHost,
  catalog: Catalog,
  yearId: string,
  yearName: string | undefined,
  teacher?: Teacher,
) {
  setModal(
    <Modal
      title="Assign teacher to school"
      description={`One school per teacher for ${yearName}.`}
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
          A school can have multiple teachers. Existing sessions must be removed before reassigning
          a teacher.
        </div>
      </Form>
    </Modal>,
  );
}

export function confirmAction(
  { setModal, saved }: ModalHost,
  title: string,
  description: string,
  fn: () => Promise<void>,
) {
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

export function userForm({ setModal, saved }: ModalHost, account?: User) {
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

export function resetPassword({ setModal, saved }: ModalHost, account: User) {
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

export function yearForm({ setModal, saved }: ModalHost) {
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
