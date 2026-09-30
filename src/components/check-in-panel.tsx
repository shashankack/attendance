"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

import { checkIn, checkOut, onOfficeWifi } from "@/lib/actions";
import { readDeviceSecret } from "@/lib/device";
import { distanceMeters } from "@/lib/geo";
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
  latitude,
  longitude,
  radius,
  requireNetwork,
}: {
  employeeId: string;
  firstName: string;
  checkedIn: boolean;
  checkedOut: boolean;
  checkInLabel: string | null;
  checkOutLabel: string | null;
  status: "PRESENT" | "LATE" | "ABSENT" | null;
  officeName: string;
  latitude: number;
  longitude: number;
  radius: number;
  requireNetwork: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"in" | "out" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function locate(kind: "in" | "out") {
    if (pending) return;
    if (!navigator.geolocation) {
      setMessage("This browser cannot read a location.");
      return;
    }

    setPending(kind);
    setMessage("Finding your location…");

    if (requireNetwork) {
      const onWifi = await onOfficeWifi();
      if (!onWifi) {
        setPending(null);
        setMessage("Connect to the office Wi-Fi. Marking stays unavailable on other networks.");
        return;
      }
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = position.coords;
        if (coords.accuracy > radius) {
          setPending(null);
          setMessage(
            `This GPS reading is only accurate to about ${Math.round(coords.accuracy)} m. Marking needs a fix sharper than ${radius} m. Try again.`,
          );
          return;
        }

        const distance = distanceMeters(coords.latitude, coords.longitude, latitude, longitude);
        if (distance > radius) {
          setPending(null);
          setMessage(`You are ${Math.round(distance)} m from the office. Marking is available within ${radius} m.`);
          return;
        }

        const payload = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          deviceToken: readDeviceSecret(employeeId),
        };
        const result = kind === "in" ? await checkIn(payload) : await checkOut(payload);
        setPending(null);
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
        setMessage(null);
        router.refresh();
      },
      () => {
        setPending(null);
        setMessage("Allow location access. Attendance is only marked from your real position.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const phase = checkedOut ? "done" : checkedIn ? "leave" : "arrive";
  const headline = checkedOut ? `${firstName} has left` : checkedIn ? `${firstName} is marked in` : `${firstName} has not marked attendance`;

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
            ? `In at ${checkInLabel}, left at ${checkOutLabel}.`
            : checkedIn
              ? `In at ${checkInLabel}. Log your leaving time when you go. Signing out, or signing in on another device, does not record it.`
              : `Press the button when you are inside ${radius} m of the office. Location is checked only then.`}
        </p>
        {status === "LATE" ? <StatusBadge tone="late">Late arrival</StatusBadge> : null}
        {status === "PRESENT" ? <StatusBadge tone="in">On time</StatusBadge> : null}
        {status === "ABSENT" ? <StatusBadge tone="absent">Absent</StatusBadge> : null}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        <Button
          type="button"
          size="lg"
          disabled={phase === "done" || pending !== null}
          onClick={() => void locate(phase === "leave" ? "out" : "in")}
          className="h-12 text-base"
        >
          {pending !== null ? "Checking location…" : phase === "done" ? "Marked today" : phase === "leave" ? "Log leaving time" : "Mark attendance"}
        </Button>
        {phase !== "done" ? (
          <p className="text-sm text-muted-foreground">Location and office Wi-Fi are checked when you press the button.</p>
        ) : null}
        {message ? <p className={pending ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{message}</p> : null}
      </CardFooter>
    </Card>
  );
}
