/** Shared marketing copy for South Eastern Electrical Services. */

export const SERVICES = [
  {
    title: "Panel upgrades",
    copy: "Bring your service up to today’s loads with a safe, code-compliant panel upgrade.",
  },
  {
    title: "Whole home rewires",
    copy: "Full-home rewiring for aging wiring, renovations, and long-term peace of mind.",
  },
  {
    title: "Landscape lighting",
    copy: "Outdoor lighting that adds curb appeal, safety, and evening usability.",
  },
  {
    title: "Fixture replacements",
    copy: "Swap outdated or failed fixtures for brighter, more efficient options.",
  },
  {
    title: "Whole home re-devices",
    copy: "Replace outlets, switches, and devices throughout the home for safety and reliability.",
  },
  {
    title: "Surge protection",
    copy: "Protect your panel and appliances from damaging power surges.",
  },
  {
    title: "Circuit restoration",
    copy: "Diagnose and restore circuits that trip, fail, or no longer carry load safely.",
  },
  {
    title: "Meter base replacements",
    copy: "Replace damaged or outdated meter bases so your service stays sound and compliant.",
  },
  {
    title: "Hot tub disconnects",
    copy: "Proper disconnect installs for hot tubs and spa equipment, done to code.",
  },
  {
    title: "Home generators",
    copy: "Generator installation and transfer setup so backup power is ready when you need it.",
  },
] as const;

/** Featured subset for the home page. */
export const FEATURED_SERVICES = [
  SERVICES[0],
  SERVICES[1],
  SERVICES[5],
] as const;

export const MISSION =
  "To be a trusted partner providing safe, reliable, and affordable energy options to our members.";

export const VISION =
  "To improve the quality of life for our members and embrace beneficial opportunities in a changing industry.";

export const VALUES = [
  "Service",
  "Safety",
  "Fiscal Responsibility",
  "Integrity",
  "Communicate & Educate",
  "Commitment to Community",
] as const;
