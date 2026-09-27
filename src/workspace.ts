import type { ReactNode } from "react";
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
} from "lucide-react";
import type { Catalog, User } from "./types";

export type Page =
  | "Dashboard"
  | "All Schedules"
  | "Schools"
  | "Teachers"
  | "Conflicts"
  | "Data Import"
  | "Users"
  | "Audit Log"
  | "Settings";
export const NAV = [
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
export const SUBTITLES: Record<Page, string> = {
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
export const EMPTY_CATALOG: Catalog = {
  schools: [],
  teachers: [],
  classes: [],
  assignments: [],
  academic_years: [],
};
/** Filters that accept several values at once; an empty list means "all". */
export type ListFilter = "school_id" | "teacher_id" | "day" | "grade" | "class_id";
export const LIST_FILTERS: ListFilter[] = ["school_id", "teacher_id", "day", "grade", "class_id"];
export type Filter = Record<ListFilter, string[]> & { search: string };
export const CLEAR: Filter = {
  school_id: [],
  teacher_id: [],
  day: [],
  grade: [],
  class_id: [],
  search: "",
};
export type Auth = { user: User; csrf_token: string; access_token?: string };

/** Lets pages open a modal and report a successful save back to the workspace. */
export type ModalHost = {
  setModal: (modal: ReactNode) => void;
  saved: (message?: string) => Promise<void>;
};
