"use client";

import { useActionState } from "react";

import { login, type ActionResult } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => login(formData),
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required defaultValue="admin@baw.dev" className="h-10 bg-card" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          defaultValue="password"
          className="h-10 bg-card"
        />
      </div>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" disabled={pending} className="h-10 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
