"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { updateOffice } from "@/lib/actions";
import type { Office } from "@/lib/types";

export function OfficeEditor({ office }: { office: Office }) {
  const router = useRouter();
  const [name, setName] = useState(office.name);
  const [latitude, setLatitude] = useState(String(office.latitude));
  const [longitude, setLongitude] = useState(String(office.longitude));
  const [radius, setRadius] = useState(String(office.allowedRadiusMeters));
  const [publicIp, setPublicIp] = useState(office.publicIp);
  const [requireNetwork, setRequireNetwork] = useState(office.requireOfficeNetwork);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await updateOffice({
      name,
      latitude: Number(latitude),
      longitude: Number(longitude),
      allowedRadiusMeters: Number(radius),
      publicIp,
      requireOfficeNetwork: requireNetwork,
    });
    setPending(false);
    setMessage(result.ok ? "Office saved." : result.message);
    if (result.ok) router.refresh();
  }

  function useHere() {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setMessage("Pin moved to this browser’s location. Save to apply it.");
      },
      () => setMessage("Location permission is required to move the office pin."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <form onSubmit={save} className="rounded-3xl border border-line bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl">Office pin</h2>
          <p className="mt-1 text-sm text-muted">
            Employees can check in only inside this radius. Move the pin to where you are if you are demonstrating away from Bangalore.
          </p>
        </div>
        <button type="button" onClick={useHere} className="shrink-0 rounded-full border border-line px-3 py-2 text-sm">
          Use my location
        </button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">
          Radius in meters
          <input value={radius} onChange={(event) => setRadius(event.target.value)} inputMode="numeric" className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">
          Latitude
          <input value={latitude} onChange={(event) => setLatitude(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2" />
        </label>
        <label className="block text-sm">
          Longitude
          <input value={longitude} onChange={(event) => setLongitude(event.target.value)} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2" />
        </label>
        <label className="block text-sm sm:col-span-2">
          Office public IP
          <input value={publicIp} onChange={(event) => setPublicIp(event.target.value)} placeholder="Optional" className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2" />
        </label>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={requireNetwork} onChange={(event) => setRequireNetwork(event.target.checked)} />
        Require the office public IP
      </label>
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
      <button type="submit" disabled={pending} className="mt-4 rounded-xl bg-ink px-4 py-2 text-paper disabled:opacity-60">
        {pending ? "Saving…" : "Save office"}
      </button>
    </form>
  );
}
