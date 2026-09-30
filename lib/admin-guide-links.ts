export const ADMIN_GUIDE_PATH = "/admin/guide";

/**
 * Anchors into `docs/admin-guide.md`, generated from its `##` headings.
 * `loadAdminGuide` warns in development if one stops matching a heading.
 */
export const GUIDE_SECTION_IDS = {
  bookings: "4-bookings-page",
  availability: "5-availability-page",
  settings: "6-settings-page",
  emails: "7-booking-notification-emails",
  tasks: "8-step-by-step-common-tasks",
  troubleshooting: "10-troubleshooting",
  contact: "11-when-to-contact-your-developer",
  quickReference: "12-quick-reference",
} as const;

export type GuideSectionKey = keyof typeof GUIDE_SECTION_IDS;

export function guideHref(section?: GuideSectionKey): string {
  return section
    ? `${ADMIN_GUIDE_PATH}#${GUIDE_SECTION_IDS[section]}`
    : ADMIN_GUIDE_PATH;
}
