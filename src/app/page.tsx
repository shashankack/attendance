import { LoginForm } from "@/components/login-form";

export default function HomePage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
      <section className="relative flex flex-col justify-between bg-sidebar px-8 py-10 text-paper sm:px-12">
        <p className="text-sm tracking-[0.22em] uppercase text-[#d9cbb8]">BAW · Bangalore</p>
        <div>
          <h1 className="max-w-xl font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            The day starts when you are actually here.
          </h1>
          <p className="mt-6 max-w-md text-lg text-[#d9cbb8]">
            Employees check in from the office. The server measures the distance. Admins see who is in, who is late, and who has left.
          </p>
        </div>
        <p className="text-sm text-[#b7aa98]">Single office. Location is requested only when someone marks attendance.</p>
      </section>
      <section className="flex items-center bg-paper px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <h2 className="font-serif text-3xl">Sign in</h2>
          <p className="mt-2 text-muted">Use a demo desk to look around. Password for both is password.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
          <div className="mt-6 grid gap-2 text-sm text-muted">
            <p>Employee: arun@baw.dev</p>
            <p>Admin: admin@baw.dev</p>
          </div>
        </div>
      </section>
    </div>
  );
}
