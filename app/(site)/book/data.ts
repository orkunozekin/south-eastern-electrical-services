import {
  DEFAULT_BOOKING_SETTINGS,
  getBookableDateStrings,
} from "@/lib/booking";
import { isFirebaseAdminConfigured } from "@/lib/firebase/config";

/**
 * Safe for SSR: never imports firebase-admin.
 * Calendar dates come from defaults; live settings load client-side via actions.
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
