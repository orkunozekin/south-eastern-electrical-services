export function shouldLoadUpSmithWidget(
  nodeEnv: string | undefined,
  vercelEnv: string | undefined,
): boolean {
  if (nodeEnv !== "production") return false;
  return vercelEnv === undefined || vercelEnv === "production";
}
