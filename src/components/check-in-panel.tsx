"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

import { checkIn, checkOut } from "@/lib/actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function CheckInPanel({
  employeeId,
  firstName,
  checkedIn,
  checkedOut,
  checkInLabel,
  checkOutLabel,
  status,
  officeName,
  radius,
}: {
  employeeId: string;
  firstName: string;
  checkedIn: boolean;
  checkedOut: boolean;
  checkInLabel: string | null;
  checkOutLabel: string | null;
  status: "PRESENT" | "LATE" | null;
  officeName: string;
  radius: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function locate(kind: "in" | "out") {
    if (!navigator.geolocation) {
      setMessage("This browser cannot read a location.");
      return;
    }

    setPending(true);
    setMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const payload = {
          employeeId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        const result = kind === "in" ? await checkIn(payload) : await checkOut(payload);
        setPending(false);
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
        setMessage(null);
        router.refresh();
      },
      () => {
        setPending(false);
        setMessage("Allow location access. Attendance is only marked from your real position.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const headline = checkedOut ? `${firstName} is done for the day` : checkedIn ? `${firstName} is checked in` : `${firstName} is not checked in`;

  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5 tracking-[0.14em] uppercase">
          <MapPin className="size-3.5" />
          {officeName}
        </CardDescription>
        <CardTitle className="font-serif text-4xl leading-tight tracking-tight">{headline}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          {checkedOut
            ? `In at ${checkInLabel}, out at ${checkOutLabel}.`
            : checkedIn
              ? `Started at ${checkInLabel}. Check out before leaving the office.`
              : `Check-in is accepted inside ${radius} m of the office. The browser only supplies coordinates.`}
        </p>
        {status ? <StatusBadge tone={status === "LATE" ? "late" : "in"}>{status === "LATE" ? "Late arrival" : "On time"}</StatusBadge> : null}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        {!checkedIn ? (
          <Button type="button" size="lg" disabled={pending} onClick={() => locate("in")} className="h-12 text-base">
            {pending ? "Checking location…" : "Check in"}
          </Button>
        ) : null}
        {checkedIn && !checkedOut ? (
          <Button type="button" size="lg" variant="secondary" disabled={pending} onClick={() => locate("out")} className="h-12 text-base">
            {pending ? "Checking location…" : "Check out"}
          </Button>
        ) : null}
        {message ? <p className={pending ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{message}</p> : null}
      </CardFooter>
    </Card>
  );
}
