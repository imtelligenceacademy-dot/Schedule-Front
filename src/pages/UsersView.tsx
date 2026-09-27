import { ShieldCheck } from "lucide-react";
import { api } from "../api";
import { datetime, initials } from "../components";
import { confirmAction, resetPassword, userForm } from "../forms";
import type { User } from "../types";
import type { ModalHost } from "../workspace";

export function UsersView({
  users,
  currentUser,
  host,
}: {
  users: User[];
  currentUser: User;
  host: ModalHost;
}) {
  return (
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
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="person">
                    <div className="avatar light">{initials(u.full_name)}</div>
                    <div>
                      <strong>
                        {u.full_name}
                        {u.id === currentUser.id ? " (you)" : ""}
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
                    <button className="text-button" onClick={() => userForm(host, u)}>
                      Edit
                    </button>
                    {u.id !== currentUser.id && (
                      <>
                        <button className="text-button" onClick={() => resetPassword(host, u)}>
                          Reset password
                        </button>
                        <button
                          className={`text-button ${u.active ? "danger" : ""}`}
                          onClick={() =>
                            confirmAction(
                              host,
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
        <ShieldCheck size={17} /> Viewers can browse schedules. Admins can edit and import. Super
        Admins manage people and configuration.
      </div>
    </div>
  );
}
