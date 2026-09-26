export type Role = "SUPER_ADMIN" | "ADMIN" | "VIEWER";
export interface User {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  active: boolean;
  export_allowed: boolean;
  must_change_password: boolean;
  created_at: string;
  last_login: string | null;
}
export interface School {
  id: number;
  name: string;
  color: string;
  active: boolean;
}
export interface Teacher {
  id: number;
  full_name: string;
  email: string | null;
  active: boolean;
}
export interface SchoolClass {
  id: number;
  school_id: number;
  grade: string;
  name: string;
}
export interface Assignment {
  id: number;
  teacher_id: number;
  school_id: number;
  academic_year_id: number;
}
export interface Year {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  active: boolean;
  archived: boolean;
}
export interface Catalog {
  schools: School[];
  teachers: Teacher[];
  classes: SchoolClass[];
  assignments: Assignment[];
  academic_years: Year[];
}
export interface Entry {
  id: number;
  academic_year_id: number;
  school_id: number;
  teacher_id: number;
  class_id: number;
  day: number;
  start_time: string;
  end_time: string;
  notes: string;
  school_name: string;
  school_color: string;
  teacher_name: string;
  grade: string;
  class_name: string;
  version: number;
  updated_by_name: string;
  updated_at: string;
  created_at: string;
}
export interface Conflict {
  id: string;
  types: string[];
  first: Entry;
  second: Entry;
}
export interface Breakdown {
  id: number;
  name: string;
  color: string;
  sessions: number;
  minutes: number;
}
export interface Dashboard {
  active_schools: number;
  teachers: number;
  weekly_sessions: number;
  weekly_hours: number;
  conflicts: number;
  today: Entry[];
  upcoming: (Entry & { next_date: string })[];
  by_school: Breakdown[];
  by_teacher: Breakdown[];
  date: string;
  timezone: string;
}
export interface Audit {
  id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  timestamp: string;
}
export interface ImportResult {
  dry_run: boolean;
  valid_rows: number;
  errors: { row: number; message: string }[];
  conflicts: Conflict[];
  imported: number;
}
