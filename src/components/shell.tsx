import { logout } from "@/lib/actions";

export function Shell({
  name,
  role,
  day,
  children,
}: {
  name: string;
  role: "ADMIN" | "EMPLOYEE";
  day: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <span className="font-serif text-xl tracking-tight">BAW</span>
            <span className="hidden text-sm text-muted sm:inline">{day}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted">
              {name}
              <span className="ml-2 rounded-full bg-paper px-2 py-1 text-xs uppercase tracking-wide text-ink">
                {role === "ADMIN" ? "Admin" : "Employee"}
              </span>
            </span>
            <form action={logout}>
              <button type="submit" className="text-muted underline-offset-4 hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
