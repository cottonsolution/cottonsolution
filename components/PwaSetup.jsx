"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pushClient";

/** Renders nothing — just registers the service worker on mount so this page (and only this page, since the manifest link is per-page too) is installable. */
export default function PwaSetup() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
