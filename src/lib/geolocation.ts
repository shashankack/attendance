function isAppleTouchDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function permissionDeniedMessage() {
  if (isAppleTouchDevice()) {
    return "Safari blocked location for this page. On the iPhone go to Settings → Privacy & Security → Location Services → Safari Websites, set it to While Using the App, then reload and try again.";
  }
  if (isAndroid()) {
    return "Chrome blocked location for this page. Turn on Location for the phone, open Chrome → Site settings (lock or tune icon by the address) → Location → Allow, and use Precise location if offered. Then reload and try again.";
  }
  return "This browser blocked location for this page. Allow location for this site, reload, and try again.";
}

export function locationFailureMessage(error: { code?: number }) {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Location needs a secure page (https). Open the site from its https address.";
  }
  if (error.code === 1) {
    return permissionDeniedMessage();
  }
  if (error.code === 3) {
    return "The GPS fix timed out. Step nearer a window or open space, then try again.";
  }
  if (error.code === 2) {
    if (isAndroid()) {
      return "This phone could not get a GPS fix. Turn on Location and Precise location for Chrome, step nearer a window, then try again.";
    }
    return "This phone could not get a GPS fix. Turn on Location Services, then try again.";
  }
  return "A location reading could not be taken. Try again in a moment.";
}

function oncePosition(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function watchOnce(options: PositionOptions, waitMs: number) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    let settled = false;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (settled) return;
        settled = true;
        navigator.geolocation.clearWatch(watchId);
        window.clearTimeout(timer);
        resolve(position);
      },
      (error) => {
        if (settled) return;
        settled = true;
        navigator.geolocation.clearWatch(watchId);
        window.clearTimeout(timer);
        reject(error);
      },
      options,
    );
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      reject({ code: 3, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "Timeout expired" });
    }, waitMs);
  });
}

/**
 * Start GPS in the same JavaScript turn as a user tap (required on iOS Safari).
 * Returns a promise; do not await anything before calling this.
 */
export function startLocationReading() {
  const apple = isAppleTouchDevice();
  const android = isAndroid();

  // iOS / Android: start a quick fix and a high-accuracy watch together.
  if (apple || android) {
    const quick = oncePosition({ enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 });
    const precise = watchOnce({ enableHighAccuracy: true, timeout: 25000, maximumAge: 10000 }, 28000);
    return Promise.any([quick, precise]).catch(async () => {
      return oncePosition({ enableHighAccuracy: false, timeout: 25000, maximumAge: 0 });
    });
  }

  return oncePosition({ enableHighAccuracy: true, timeout: 25000, maximumAge: 0 }).catch((error: GeolocationPositionError) => {
    if (error.code === error.PERMISSION_DENIED) throw error;
    return oncePosition({ enableHighAccuracy: false, timeout: 25000, maximumAge: 60000 });
  });
}
