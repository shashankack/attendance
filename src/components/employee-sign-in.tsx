"use client";

import { useActionState } from "react";

import { signInEmployee, type ActionResult } from "@/lib/actions";
import { ensureDeviceSecret } from "@/lib/device";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmployeeSignIn({ employeeId }: { employeeId: string }) {
  const [state, action, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => {
      const pin = String(formData.get("pin") ?? "");
      const deviceToken = ensureDeviceSecret(employeeId);
      return signInEmployee(employeeId, pin, deviceToken);
    },
    null,
  );

  return (
    <form action={action} className="space-y-4">
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
      <p className="text-sm text-muted-foreground">
        The first sign-in on this phone links it to your account. After that, only this phone can sign in and mark attendance until an admin clears it.
      </p>
      {state && !state.ok ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" disabled={pending} className="h-10 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
