"use client";

import { useSyncExternalStore } from "react";
import { getViewerTimezone } from "@/lib/timezone";

const subscribe = () => () => {};

/** Browser timezone after hydration; business timezone on the server. */
export function useViewerTimezone(fallback: string): string {
  return useSyncExternalStore(
    subscribe,
    () => getViewerTimezone(fallback),
    () => fallback,
  );
}
