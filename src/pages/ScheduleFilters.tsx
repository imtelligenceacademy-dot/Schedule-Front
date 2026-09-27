import { Search } from "lucide-react";
import { DAYS } from "../components";
import type { Catalog } from "../types";
import type { Filter } from "../workspace";

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
  onFilter: (name: keyof Filter, value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="filter-panel">
      <div className="search-input">
        <Search size={17} />
        <input
          aria-label="Search schedules"
          placeholder="Search school, teacher, class…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <select
        aria-label="Filter by school"
        value={filter.school_id}
        onChange={(e) => onFilter("school_id", e.target.value)}
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
        onChange={(e) => onFilter("teacher_id", e.target.value)}
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
        onChange={(e) => onFilter("day", e.target.value)}
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
        onChange={(e) => onFilter("grade", e.target.value)}
      >
        <option value="">All grades</option>
        {[...new Set(catalog.classes.map((x) => x.grade))].sort().map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <select
        aria-label="Filter by class"
        value={filter.class_id}
        onChange={(e) => onFilter("class_id", e.target.value)}
      >
        <option value="">All classes</option>
        {catalog.classes
          .filter((x) => !filter.school_id || String(x.school_id) === filter.school_id)
          .map((x) => (
            <option key={x.id} value={x.id}>
              {x.grade} · {x.name}
            </option>
          ))}
      </select>
      {Object.values(filter).some(Boolean) && (
        <button className="text-button" onClick={onClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
