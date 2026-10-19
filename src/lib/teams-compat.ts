/** Recognize the specific schema mismatch when app code deploys before
 * the optional captain-partnership migration. Never swallow other SQL errors.
 */
export function isMissingPartnerColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("co_captain_user_id") &&
    (error.code === "42703" || error.code === "PGRST204" ||
     message.includes("does not exist") || message.includes("schema cache"));
}
