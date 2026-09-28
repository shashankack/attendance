"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LocateFixed, Wifi } from "lucide-react";

import { officeWifi, updateOffice } from "@/lib/actions";
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
  const [readingWifi, setReadingWifi] = useState(false);
  const [committed, setCommitted] = useState({
    name: office.name,
    latitude: String(office.latitude),
    longitude: String(office.longitude),
    radius: String(office.allowedRadiusMeters),
    publicIp: office.publicIp,
    requireNetwork: office.requireOfficeNetwork,
  });
  const dirty =
    name !== committed.name ||
    latitude !== committed.latitude ||
    longitude !== committed.longitude ||
    radius !== committed.radius ||
    publicIp !== committed.publicIp ||
    requireNetwork !== committed.requireNetwork;

  useEffect(() => {
    const next = {
      name: office.name,
      latitude: String(office.latitude),
      longitude: String(office.longitude),
      radius: String(office.allowedRadiusMeters),
      publicIp: office.publicIp,
      requireNetwork: office.requireOfficeNetwork,
    };
    setName(next.name);
    setLatitude(next.latitude);
    setLongitude(next.longitude);
    setRadius(next.radius);
    setPublicIp(next.publicIp);
    setRequireNetwork(next.requireNetwork);
    setCommitted(next);
  }, [office.name, office.latitude, office.longitude, office.allowedRadiusMeters, office.publicIp, office.requireOfficeNetwork]);

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
    if (result.ok) {
      setCommitted({ name, latitude, longitude, radius, publicIp, requireNetwork });
      router.refresh();
    }
  }

  async function useWifi() {
    setReadingWifi(true);
    const result = await officeWifi();
    if (!result.ok) {
      setReadingWifi(false);
      setMessage(result.message);
      return;
    }

    let ip = result.ip;
    if (!ip) {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const body = (await response.json()) as { ip?: string };
        ip = body.ip?.trim() ?? "";
      } catch {
        ip = "";
      }
    }

    setReadingWifi(false);
    if (!ip) {
      setMessage("Join the office Wi-Fi, then try again. The address could not be read.");
      return;
    }

    setPublicIp(ip);
    if (result.seenByServer) setRequireNetwork(true);
    setMessage(
      result.seenByServer
        ? "This Wi-Fi is filled in. Save to require it for attendance."
        : "This Wi-Fi’s internet address is filled in. Save it. Require it once people open the site from that Wi-Fi.",
    );
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
            <Label htmlFor="office-ip">Office Wi-Fi</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="office-ip"
                value={publicIp}
                onChange={(event) => setPublicIp(event.target.value)}
                placeholder="Filled in when you use this Wi-Fi"
                className="bg-card"
              />
              <Button type="button" variant="outline" disabled={readingWifi} onClick={() => void useWifi()}>
                <Wifi />
                {readingWifi ? "Reading Wi-Fi…" : "Use this Wi-Fi"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Join the office Wi-Fi on this phone or computer, then press Use this Wi-Fi. The address is filled in for you.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={requireNetwork} onCheckedChange={(value) => setRequireNetwork(value === true)} />
            Only allow attendance on this Wi-Fi
          </label>
          {message ? <p className="text-sm text-muted-foreground sm:col-span-2">{message}</p> : null}
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <Button type="button" variant="outline" onClick={useHere}>
            <LocateFixed />
            Use my location
          </Button>
          <Button type="submit" disabled={!dirty || pending}>
            {pending ? "Saving…" : "Save office"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
