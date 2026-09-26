/** Bank data must originate from a verified read-only account feed, never a customer's browser. */
export type VerifiedCredit = {
  source: "bank-feed";
  transactionId: string;
  recipientBsb: string;
  recipientAccount: string;
  amountCents: number;
  currency: "AUD";
  reference: string;
  settled: boolean;
};

export type BankInvoice = {
  customerNumber: string;
  amountCents: number;
  currency: "AUD";
};

export type BankMatch = "match" | "review" | "ignore";

/** A credit is only a candidate. A durable unique transaction claim is required before activation. */
export function matchBankCredit(credit: VerifiedCredit, invoice: BankInvoice): BankMatch {
  if (!credit.settled || credit.amountCents <= 0 || credit.currency !== invoice.currency ||
      credit.recipientBsb.replace(/\D/g, "") !== "032070" ||
      credit.recipientAccount.replace(/\D/g, "") !== "914904") return "ignore";
  if (!/^[\w:/-]{1,120}$/.test(credit.transactionId)) return "review";
  const references = credit.reference.toUpperCase().match(/\bRC[\s-]*0*\d{7}\b/g) || [];
  const numbers = [...new Set(references.map(value => value.replace(/\D/g, "").padStart(7, "0")))];
  const expected = invoice.customerNumber.replace(/\D/g, "").padStart(7, "0");
  if (numbers.length !== 1 || numbers[0] !== expected || credit.amountCents !== invoice.amountCents) return "review";
  return "match";
}
