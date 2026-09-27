import type { Dispatch, SetStateAction } from "react";
import { Empty, datetime, initials } from "../components";
import type { Audit } from "../types";

export function AuditLogView({
  data,
  page,
  setPage,
}: {
  data: { items: Audit[]; total: number };
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
}) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Workspace activity</h2>
        <span className="muted">{data.total} events</span>
      </div>
      {data.items.map((a) => (
        <div className="audit-row" key={a.id}>
          <div className="avatar light">{initials(a.user_name)}</div>
          <div>
            <strong>{a.user_name}</strong>
            <p>
              {a.action.replaceAll("_", " ")} · {a.entity_type.replaceAll("_", " ")} #{a.entity_id}
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
      {!data.items.length && <Empty title="No activity yet" />}
      <div className="pagination">
        <button className="button secondary" disabled={!page} onClick={() => setPage((x) => x - 1)}>
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          className="button secondary"
          disabled={(page + 1) * 50 >= data.total}
          onClick={() => setPage((x) => x + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
