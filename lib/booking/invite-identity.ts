import { buildInviteUid } from "@/lib/calendar-invite";

/** Persisted before sending so later sender changes cannot orphan an invite. */
export function inviteIdentity(
  id: string,
  fromEmail = process.env.PLUNK_FROM_EMAIL?.trim(),
) {
  return {
    inviteUid: buildInviteUid(id, fromEmail),
    ...(fromEmail ? { inviteOrganizerEmail: fromEmail } : {}),
  };
}
