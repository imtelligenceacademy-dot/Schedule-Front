import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Bot, X, AlertCircle, Loader2 } from "lucide-react";

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}
export function datetime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
export function Brand() {
  return (
    <div className="brand">
      <div className="brand-icon">
        <Bot size={25} />
      </div>
      <div>
        <strong>IM-Telligence</strong>
        <span>ROBOTICS OPERATIONS</span>
      </div>
    </div>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Bot size={26} />
      </div>
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
export function ErrorBox({ error }: { error: string }) {
  return error ? (
    <div className="error-box" role="alert">
      <AlertCircle size={18} />
      <span>{error}</span>
    </div>
  ) : null;
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ id?: string }>, { id })
        : children}
    </div>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <div className="modal-head">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>{description || "Enter the details below."}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button" aria-label="Close dialog">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Form({
  onSave,
  children,
  label = "Save changes",
  onCancel,
}: {
  onSave: (data: FormData) => Promise<void>;
  children: ReactNode;
  label?: string;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(e.currentTarget);
    try {
      await onSave(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="form-body">
        {children}
        <ErrorBox error={error} />
      </div>
      <div className="modal-foot">
        <button type="button" className="button secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button className="button primary" disabled={busy}>
          {busy && <Loader2 className="spin" size={16} />} {label}
        </button>
      </div>
    </form>
  );
}
export function Text({
  id,
  name,
  value = "",
  required = true,
  type = "text",
  maxLength = 150,
  minLength,
}: {
  id?: string;
  name: string;
  value?: string;
  required?: boolean;
  type?: string;
  maxLength?: number;
  minLength?: number;
}) {
  return (
    <input
      id={id}
      name={name}
      defaultValue={value}
      required={required}
      type={type}
      maxLength={maxLength}
      minLength={minLength}
      autoComplete={type === "password" ? "new-password" : undefined}
    />
  );
}
