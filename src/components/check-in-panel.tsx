"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

import { checkIn, checkOut, onOfficeWifi } from "@/lib/actions";
import { distanceMeters } from "@/lib/geo";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Place =
  | { kind: "locating" }
  | { kind: "denied" }
  | { kind: "outside"; distance: number }
  | { kind: "coarse"; accuracy: number }
  | { kind: "inside" };

function readPlace(coords: GeolocationCoordinates, latitude: number, longitude: number, radius: number): Place {
  if (coords.accuracy > radius) return { kind: "coarse", accuracy: coords.accuracy };
  const distance = distanceMeters(coords.latitude, coords.longitude, latitude, longitude);
  if (distance > radius) return { kind: "outside", distance };
  return { kind: "inside" };
}

function placeNote(place: Place, radius: number) {
  if (place.kind === "locating") return "Checking that you are inside the office…";
  if (place.kind === "denied") return "Allow location access. Marking stays unavailable until you are inside the office.";
  if (place.kind === "coarse") {
    return `This GPS reading is only accurate to about ${Math.round(place.accuracy)} m. Marking stays unavailable until the fix is sharper than ${radius} m.`;
  }
  if (place.kind === "outside") {
    return `You are ${Math.round(place.distance)} m from the office. Marking is available within ${radius} m.`;
  }
  return "You are inside the office.";
}

export function CheckInPanel({
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
  firstName: string;
  checkedIn: boolean;
  checkedOut: boolean;
  checkInLabel: string | null;
  checkOutLabel: string | null;
  status: "PRESENT" | "LATE" | null;
  officeName: string;
  latitude: number;
  longitude: number;
  radius: number;
  requireNetwork: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"in" | "out" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [place, setPlace] = useState<Place>({ kind: "locating" });
  const [onWifi, setOnWifi] = useState(!requireNetwork);
  const inside = place.kind === "inside";
  const ready = inside && onWifi;

  useEffect(() => {
    if (checkedOut) return;
    if (!navigator.geolocation) {
      setPlace({ kind: "denied" });
      return;
    }

    const watch = navigator.geolocation.watchPosition(
      (position) => setPlace(readPlace(position.coords, latitude, longitude, radius)),
      () => setPlace({ kind: "denied" }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [checkedOut, latitude, longitude, radius]);

  useEffect(() => {
    if (checkedOut || !requireNetwork) {
      setOnWifi(true);
      return;
    }

    let stopped = false;
    async function check() {
      const allowed = await onOfficeWifi();
      if (!stopped) setOnWifi(allowed);
    }
    void check();
    const timer = window.setInterval(() => void check(), 15000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [checkedOut, requireNetwork]);

  function locate(kind: "in" | "out") {
    if (!ready) return;
    if (!navigator.geolocation) {
      setMessage("This browser cannot read a location.");
      return;
    }

    setPending(kind);
    setMessage("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const payload = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
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
              : `Mark attendance once inside ${radius} m of the office. You can log your leaving time later from this same button.`}
        </p>
        {status ? <StatusBadge tone={status === "LATE" ? "late" : "in"}>{status === "LATE" ? "Late arrival" : "On time"}</StatusBadge> : null}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        <Button
          type="button"
          size="lg"
          disabled={phase === "done" || pending !== null || !ready}
          onClick={() => locate(phase === "leave" ? "out" : "in")}
          className="h-12 text-base"
        >
          {pending !== null ? "Checking location…" : phase === "done" ? "Marked today" : phase === "leave" ? "Log leaving time" : "Mark attendance"}
        </Button>
        {phase !== "done" ? (
          <p className="text-sm text-muted-foreground">
            {inside && requireNetwork && !onWifi ? "Connect to the office Wi-Fi. Marking stays unavailable on other networks." : placeNote(place, radius)}
          </p>
        ) : null}
        {message ? <p className={pending ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>{message}</p> : null}
      </CardFooter>
    </Card>
  );
}
