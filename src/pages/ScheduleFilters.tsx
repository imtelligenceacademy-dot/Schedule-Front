import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { DAYS } from "../components";
import { MultiSelect } from "../MultiSelect";
import type { Catalog } from "../types";
import { LIST_FILTERS, type Filter, type ListFilter } from "../workspace";

export function ScheduleFilters({
  catalog,
  filter,
  search,
  onSearch,
  onFilter,
  onClear,
}: {
  catalog: Catalog;
  filter: Filter;
  search: string;
  onSearch: (value: string) => void;
  onFilter: (name: ListFilter, value: string[]) => void;
  onClear: () => void;
}) {
  // On phones the dropdowns fold behind a toggle so the schedule stays on screen.
  const [open, setOpen] = useState(false);
  const active = LIST_FILTERS.filter((key) => filter[key].length).length;
  return (
    <div className={`filter-panel ${open ? "open" : ""}`}>
      <div className="search-input">
        <Search size={17} />
        <input
          aria-label="Search schedules"
          placeholder="Search school, teacher, class…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <button
        className="button secondary filters-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <SlidersHorizontal size={16} /> Filters{active ? ` (${active})` : ""}
      </button>
      <MultiSelect
        label="Filter by school"
        allLabel="All schools"
        plural="schools"
        value={filter.school_id}
        onChange={(x) => onFilter("school_id", x)}
        options={catalog.schools.map((x) => ({
          value: String(x.id),
          label: x.name,
          color: x.color,
        }))}
      />
      <MultiSelect
        label="Filter by teacher"
        allLabel="All teachers"
        plural="teachers"
        value={filter.teacher_id}
        onChange={(x) => onFilter("teacher_id", x)}
        options={catalog.teachers.map((x) => ({ value: String(x.id), label: x.full_name }))}
      />
      <MultiSelect
        label="Filter by day"
        allLabel="All days"
        plural="days"
        value={filter.day}
        onChange={(x) => onFilter("day", x)}
        options={DAYS.map((x, i) => ({ value: String(i), label: x }))}
      />
      <MultiSelect
        label="Filter by grade"
        allLabel="All grades"
        plural="grades"
        value={filter.grade}
        onChange={(x) => onFilter("grade", x)}
        options={[...new Set(catalog.classes.map((x) => x.grade))]
          .sort()
          .map((x) => ({ value: x, label: x }))}
      />
      <MultiSelect
        label="Filter by class"
        allLabel="All classes"
        plural="classes"
        value={filter.class_id}
        onChange={(x) => onFilter("class_id", x)}
        options={catalog.classes
          .filter((x) => !filter.school_id.length || filter.school_id.includes(String(x.school_id)))
          .map((x) => ({ value: String(x.id), label: `${x.grade} · ${x.name}` }))}
      />
      {(active > 0 || filter.search) && (
        <button className="text-button" onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
