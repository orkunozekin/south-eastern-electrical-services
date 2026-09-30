import {
  DEFAULT_BOOKING_SETTINGS,
  getBookableDateStrings,
} from "@/lib/booking";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";

/**
 * Safe for SSR: never imports firebase-admin.
 * Dates here come from defaults and are only a first-paint and error fallback;
 * the wizard replaces them via `fetchBookingCalendarAction`.
 */
export function getBookingPageData(): {
  timezone: string;
  dates: string[];
  configured: boolean;
} {
  try {
    return {
      timezone: DEFAULT_BOOKING_SETTINGS.timezone,
      dates: getBookableDateStrings(DEFAULT_BOOKING_SETTINGS),
      configured: isFirebaseAdminConfigured(),
    };
  } catch (error) {
    console.error("[book] Failed to build booking page data:", error);
    return {
      timezone: "America/New_York",
      dates: [],
      configured: false,
    };
  }
}
