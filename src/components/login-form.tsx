"use client";

import { useActionState } from "react";

import { login, type ActionResult } from "@/lib/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => login(formData),
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm text-muted">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue="admin@baw.dev"
          className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 outline-none focus:border-pine"
        />
      </label>
      <label className="block">
        <span className="text-sm text-muted">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          defaultValue="password"
          className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-3 outline-none focus:border-pine"
        />
      </label>
      {state && !state.ok ? <p className="text-sm text-clay">{state.message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-ink px-4 py-3 text-paper transition hover:bg-pine-deep disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
