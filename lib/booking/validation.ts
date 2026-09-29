const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m! - 1 &&
    dt.getUTCDate() === d
  );
}

/** Digits only; strips leading US country code `1` when 11 digits. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

export function isValidPhone(phone: string): boolean {
  return normalizePhone(phone).length === 10;
}

export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 2 && trimmed.length <= 100;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

export type ValidatedBookingFields = {
  name: string;
  phone: string;
  email?: string;
};

export function validateBookingFields(
  name: unknown,
  phone: unknown,
  email?: unknown,
): { ok: true; value: ValidatedBookingFields } | { ok: false; error: string } {
  if (typeof name !== "string" || !isValidName(name)) {
    return {
      ok: false,
      error: "Please enter a valid name (2–100 characters).",
    };
  }
  if (typeof phone !== "string" || !isValidPhone(phone)) {
    return {
      ok: false,
      error: "Please enter a valid 10-digit US phone number.",
    };
  }

  const trimmedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (trimmedEmail && !isValidEmail(trimmedEmail)) {
    return {
      ok: false,
      error: "Please enter a valid email, or leave it blank.",
    };
  }

  return {
    ok: true,
    value: {
      name: name.trim(),
      phone: normalizePhone(phone),
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
    },
  };
}
