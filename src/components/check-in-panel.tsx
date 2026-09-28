"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { checkIn, checkOut } from "@/lib/actions";

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
    <section className="rounded-3xl border border-line bg-card p-6 shadow-[0_20px_50px_rgba(28,25,22,0.05)] sm:p-8">
      <p className="text-sm uppercase tracking-[0.18em] text-muted">{officeName}</p>
      <h2 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">{headline}</h2>
      <p className="mt-3 max-w-xl text-muted">
        {checkedOut
          ? `In at ${checkInLabel}, out at ${checkOutLabel}.`
          : checkedIn
            ? `Started at ${checkInLabel}. Check out before leaving the office.`
            : `Check-in is accepted inside ${radius} m of the office. The browser only supplies coordinates.`}
      </p>
      {status ? (
        <p className="mt-4 inline-flex rounded-full bg-paper px-3 py-1 text-sm">
          {status === "LATE" ? "Late arrival" : "On time"}
        </p>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {!checkedIn ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => locate("in")}
            className="rounded-2xl bg-pine px-6 py-4 text-lg text-white transition hover:bg-pine-deep disabled:opacity-60"
          >
            {pending ? "Checking location…" : "Check in"}
          </button>
        ) : null}
        {checkedIn && !checkedOut ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => locate("out")}
            className="rounded-2xl bg-ink px-6 py-4 text-lg text-paper transition hover:bg-pine-deep disabled:opacity-60"
          >
            {pending ? "Checking location…" : "Check out"}
          </button>
        ) : null}
      </div>
      {message ? <p className="mt-4 max-w-xl text-sm text-clay">{message}</p> : null}
    </section>
  );
}
