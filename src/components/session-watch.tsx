"use client";

import { useEffect } from "react";

import { sessionAlive } from "@/lib/actions";

export function SessionWatch({ href }: { href: string }) {
  useEffect(() => {
    let stopped = false;

    async function check() {
      const alive = await sessionAlive();
      if (!stopped && !alive) window.location.assign(href);
    }

    const timer = window.setInterval(() => void check(), 60_000);
    const onFocus = () => void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [href]);

  return null;
}
