"use client";

import { useActionState } from "react";

import { signInEmployee, type ActionResult } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmployeeSignIn({ employeeId }: { employeeId: string }) {
  const [state, action, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) =>
      signInEmployee(String(formData.get("employeeId") ?? ""), String(formData.get("pin") ?? "")),
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="employeeId" value={employeeId} />
      <div className="grid gap-2">
        <Label htmlFor="pin">PIN</Label>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          required
          minLength={4}
          maxLength={8}
          pattern="[0-9]{4,8}"
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
