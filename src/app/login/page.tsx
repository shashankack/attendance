import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { currentUser } from "@/lib/actions";

export default async function LoginPage() {
  const user = await currentUser();
  if (user?.role === "ADMIN") redirect("/admin");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative flex flex-col justify-between bg-sidebar px-8 py-10 text-sidebar-foreground sm:px-12">
        <p className="text-sm tracking-[0.22em] text-sidebar-foreground/70 uppercase">BAW · Bangalore</p>
        <div>
          <h1 className="max-w-xl font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">Admin desk.</h1>
          <p className="mt-6 max-w-md text-lg text-sidebar-foreground/75">
            People mark attendance from the front desk by tapping their name. This sign-in is only for managing the office.
          </p>
        </div>
        <Link href="/" className="text-sm text-sidebar-foreground/70 underline-offset-4 hover:text-sidebar-foreground hover:underline">
          Back to the attendance desk
        </Link>
      </section>
      <section className="flex items-center bg-background px-6 py-12 sm:px-10">
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-serif text-3xl">Sign in</CardTitle>
            <CardDescription>Admin password is password.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
