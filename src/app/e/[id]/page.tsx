import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmployeeSignIn } from "@/components/employee-sign-in";
import { Logo } from "@/components/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { currentEmployee } from "@/lib/actions";
import { findEmployeeById } from "@/lib/store";

export default async function EmployeeSignInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await findEmployeeById(id);
  if (!employee) notFound();

  const signedIn = await currentEmployee();
  if (signedIn?.id === employee.id) redirect("/me");

  const blocked = !employee.active
    ? "This person is inactive. Ask an admin if that is a mistake."
    : !employee.pinHash
      ? "An admin needs to set a sign-in PIN before this page can be used."
      : null;

  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(ellipse_at_top,rgba(29,107,67,0.09),transparent_52%)] text-foreground">
      <header className="border-b bg-card/80">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-3">
          <Logo />
          <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            All people
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-md px-5 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-3xl">
              {employee.firstName} {employee.lastName}
            </CardTitle>
            <CardDescription>{employee.code}</CardDescription>
          </CardHeader>
          <CardContent>
            {blocked ? <p className="text-sm text-muted-foreground">{blocked}</p> : <EmployeeSignIn employeeId={employee.id} />}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
