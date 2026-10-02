/** Persisted before sending so later sender changes cannot orphan an invite. */
export function inviteIdentity(
  id: string,
  fromEmail = process.env.PLUNK_FROM_EMAIL?.trim(),
) {
  const domain = fromEmail?.split("@")[1] || "southeasternelectrical.org";
  return {
    inviteUid: `booking-${id}@${domain}`,
    ...(fromEmail ? { inviteOrganizerEmail: fromEmail } : {}),
  };
}
