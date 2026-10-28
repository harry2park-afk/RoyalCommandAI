export const KATIE_GMAIL_ACTIONS = [
  "status",
  "search",
  "message",
  "thread",
  "attachment",
  "draft",
  "send",
] as const;

export type KatieGmailAction = (typeof KATIE_GMAIL_ACTIONS)[number];

export function isKatieGmailAction(value: unknown): value is KatieGmailAction {
  return (
    typeof value === "string" &&
    KATIE_GMAIL_ACTIONS.includes(value as KatieGmailAction)
  );
}

export function katieGmailNeedsApproval(action: unknown) {
  return action === "draft" || action === "send";
}

export function isHarryEmail(value: string) {
  const email = value.trim().toLowerCase();
  return email === "harry2park@gmail.com" || email === "harry@royalcommand.ai";
}
