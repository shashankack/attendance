"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { logout } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Desk", active: (path: string) => path === "/" },
  { href: "/admin", label: "Today", active: (path: string) => path === "/admin" },
  { href: "/admin/employees", label: "People", active: (path: string) => path.startsWith("/admin/employees") },
  { href: "/admin/teams", label: "Teams", active: (path: string) => path.startsWith("/admin/teams") },
  { href: "/admin/attendance", label: "Month", active: (path: string) => path.startsWith("/admin/attendance") },
];

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
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-5">
            <Link href={role === "ADMIN" ? "/admin" : "/"} className="flex items-center gap-2 font-serif text-xl tracking-tight">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm text-primary-foreground">B</span>
              BAW
            </Link>
            {role === "ADMIN" ? (
              <nav className="flex flex-wrap gap-1">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      link.active(pathname) && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{day}</span>
            <span className="font-medium">{name}</span>
            <Badge variant="secondary">{role === "ADMIN" ? "Admin" : "Employee"}</Badge>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
