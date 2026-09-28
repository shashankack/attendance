export type Role = "ADMIN" | "EMPLOYEE";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
};

export type Employee = {
  id: string;
  userId: string;
  code: string;
  firstName: string;
  lastName: string;
  department: string;
  officeId: string;
  active: boolean;
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
