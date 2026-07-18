"use client";

import { useEffect, useState } from "react";

import { getViewerTimezone } from "@/lib/timezone";

/** Browser timezone after mount; `fallback` during SSR / first paint. */
export function useViewerTimezone(fallback: string): string {
  const [timezone, setTimezone] = useState(fallback);

  useEffect(() => {
    setTimezone(getViewerTimezone(fallback));
  }, [fallback]);

  return timezone;
}
