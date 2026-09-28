export type Role = "ADMIN" | "EMPLOYEE";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  sessionToken: string | null;
};

export type Team = {
  id: string;
  name: string;
};

export type Employee = {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  teamId: string | null;
  officeId: string;
  active: boolean;
  pinHash: string | null;
  sessionToken: string | null;
};

export type WorkDay = {
  weekday: number;
  working: boolean;
  startMinutes: number;
  endMinutes: number;
};

export type Holiday = {
  id: string;
  date: string;
  name: string;
};

export type Office = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
  timezone: string;
  publicIp: string;
  requireOfficeNetwork: boolean;
  workDays: WorkDay[];
  holidays: Holiday[];
};

export type AttendanceStatus = "PRESENT" | "LATE";

export type Attendance = {
  id: string;
  employeeId: string;
  officeId: string;
  date: string;
  checkInAt: string;
  checkOutAt: string | null;
  checkInDistanceMeters: number;
  checkOutDistanceMeters: number | null;
  status: AttendanceStatus;
};

export type Database = {
  users: User[];
  teams: Team[];
  employees: Employee[];
  office: Office;
  attendance: Attendance[];
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};
