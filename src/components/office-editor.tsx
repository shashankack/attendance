"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed } from "lucide-react";

import { updateOffice } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <form onSubmit={save}>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">Office pin</CardTitle>
          <CardDescription>
            People can check in only inside this radius. Move the pin to where you are if you are demonstrating away from Bangalore.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="office-name">Name</Label>
            <Input id="office-name" value={name} onChange={(event) => setName(event.target.value)} className="bg-card" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="office-radius">Radius in meters</Label>
            <Input id="office-radius" value={radius} onChange={(event) => setRadius(event.target.value)} inputMode="numeric" className="bg-card" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="office-lat">Latitude</Label>
            <Input id="office-lat" value={latitude} onChange={(event) => setLatitude(event.target.value)} className="bg-card" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="office-lon">Longitude</Label>
            <Input id="office-lon" value={longitude} onChange={(event) => setLongitude(event.target.value)} className="bg-card" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="office-ip">Office public IP</Label>
            <Input id="office-ip" value={publicIp} onChange={(event) => setPublicIp(event.target.value)} placeholder="Optional" className="bg-card" />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={requireNetwork} onCheckedChange={(value) => setRequireNetwork(value === true)} />
            Require the office public IP
          </label>
          {message ? <p className="text-sm text-muted-foreground sm:col-span-2">{message}</p> : null}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <Button type="button" variant="outline" onClick={useHere}>
            <LocateFixed />
            Use my location
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save office"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
