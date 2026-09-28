const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    role text NOT NULL,
    password_hash text NOT NULL,
    session_token text
  )`,
  `CREATE TABLE IF NOT EXISTS teams (
    id text PRIMARY KEY,
    name text NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS teams_name_lower ON teams (lower(name))`,
  `CREATE TABLE IF NOT EXISTS office (
    id text PRIMARY KEY,
    name text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    allowed_radius_meters integer NOT NULL,
    timezone text NOT NULL,
    public_ip text NOT NULL DEFAULT '',
    require_office_network boolean NOT NULL DEFAULT false
  )`,
  `CREATE TABLE IF NOT EXISTS employees (
    id text PRIMARY KEY,
    code text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    team_id text REFERENCES teams (id) ON DELETE SET NULL,
    office_id text NOT NULL REFERENCES office (id),
    active boolean NOT NULL,
    pin_hash text,
    session_token text
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS employees_email_lower ON employees (lower(email))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS employees_code_lower ON employees (lower(code))`,
  `CREATE TABLE IF NOT EXISTS attendance (
    id text PRIMARY KEY,
    employee_id text NOT NULL REFERENCES employees (id),
    office_id text NOT NULL REFERENCES office (id),
    date text NOT NULL,
    check_in_at timestamptz NOT NULL,
    check_out_at timestamptz,
    check_in_distance_meters double precision NOT NULL,
    check_out_distance_meters double precision,
    status text NOT NULL,
    UNIQUE (employee_id, date)
  )`,
  `INSERT INTO office (id, name, latitude, longitude, allowed_radius_meters, timezone, public_ip, require_office_network)
   VALUES ('office', 'Office', 0, 0, 150, 'Asia/Kolkata', '', false)
   ON CONFLICT (id) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS work_days (
    weekday smallint PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
    working boolean NOT NULL,
    start_minutes integer NOT NULL,
    end_minutes integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS holidays (
    id text PRIMARY KEY,
    date text NOT NULL UNIQUE,
    name text NOT NULL
  )`,
  `INSERT INTO work_days (weekday, working, start_minutes, end_minutes)
   SELECT v.weekday, v.working, v.start_minutes, v.end_minutes
   FROM (VALUES
     (0, false, 600, 1080),
     (1, true, 600, 1080),
     (2, true, 600, 1080),
     (3, true, 600, 1080),
     (4, true, 600, 1080),
     (5, true, 600, 1080),
     (6, false, 600, 1080)
   ) AS v(weekday, working, start_minutes, end_minutes)
   WHERE NOT EXISTS (SELECT 1 FROM work_days)`,
];

export async function prepareDatabase(query) {
  for (const statement of statements) {
    await query(statement);
  }
}
