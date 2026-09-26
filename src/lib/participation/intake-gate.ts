import "server-only";

/** An explicit approved notice is required before accepting private content. */
export function privateIntakeConfiguration(): Readonly<{ noticePath: string }> | null {
  if (process.env.PARTICIPATION_INTAKE_ENABLED !== "1" ||
      process.env.PARTICIPATION_POLICY_APPROVED !== "1") return null;
  const noticePath = process.env.PARTICIPATION_PRIVACY_NOTICE_PATH ?? "";
  // The site's generic privacy page does not yet describe private proposals.
  if (noticePath === "/privacy" ||
      !/^\/privacy(?:\/[a-z0-9-]+)?(?:#[a-z0-9-]+)?$/u.test(noticePath)) return null;
  return { noticePath };
}
