import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { currentUser } from "@/lib/actions";

export default async function LoginPage() {
  const user = await currentUser();
  if (user?.role === "ADMIN") redirect("/admin");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
      <section className="relative flex flex-col justify-between bg-sidebar px-8 py-10 text-paper sm:px-12">
        <p className="text-sm tracking-[0.22em] uppercase text-[#d9cbb8]">BAW · Bangalore</p>
        <div>
          <h1 className="max-w-xl font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">Admin desk.</h1>
          <p className="mt-6 max-w-md text-lg text-[#d9cbb8]">
            People mark attendance from the front desk by tapping their name. This sign-in is only for managing the office.
          </p>
        </div>
        <Link href="/" className="text-sm text-[#b7aa98] underline-offset-4 hover:underline">
          Back to the attendance desk
        </Link>
      </section>
      <section className="flex items-center bg-paper px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <h2 className="font-serif text-3xl">Sign in</h2>
          <p className="mt-2 text-muted">Admin password is password.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </section>
    </div>
  );
}
