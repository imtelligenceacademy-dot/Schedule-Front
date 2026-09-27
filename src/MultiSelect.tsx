import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type Option = { value: string; label: string; color?: string };

/** Dropdown of checkboxes; an empty selection means "all". */
export function MultiSelect({
  label,
  allLabel,
  plural,
  options,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  plural: string;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      ref.current?.querySelector<HTMLButtonElement>(".multi-trigger")?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const selected = options.filter((x) => value.includes(x.value));
  const summary = !value.length
    ? allLabel
    : selected.length === 1
      ? selected[0].label
      : `${value.length} ${plural}`;
  const shown = query
    ? options.filter((x) => x.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;
  const toggle = (item: string) =>
    onChange(value.includes(item) ? value.filter((x) => x !== item) : [...value, item]);
  return (
    <div className={`multi-select ${value.length ? "has-value" : ""}`} ref={ref}>
      <button
        type="button"
        className="multi-trigger"
        aria-label={`${label}: ${summary}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setOpen(!open);
          setQuery("");
        }}
      >
        <span>{summary}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="multi-menu" id={menuId} role="group" aria-label={label}>
          {options.length > 8 && (
            <input
              type="search"
              aria-label={`Search ${plural}`}
              placeholder={`Search ${plural}…`}
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          <div className="multi-options">
            {shown.map((x) => (
              <label key={x.value} className="multi-option">
                <input
                  type="checkbox"
                  checked={value.includes(x.value)}
                  onChange={() => toggle(x.value)}
                />
                {x.color && <i style={{ background: x.color }} />}
                <span>{x.label}</span>
              </label>
            ))}
            {!shown.length && <p className="muted">No matches</p>}
          </div>
          {value.length > 0 && (
            <button type="button" className="text-button" onClick={() => onChange([])}>
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
