import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { canManageToolbox } from './toolbox-authority';

// The transport consumes this exact envelope. Approval of a task, template, or
// category is NOT permission to send a different message or recipient batch.
export const emailEnvelopeSchema = z.object({
  id: z.string().uuid(),
  recipients: z.array(z.string().email()).length(1),
  subject: z.string().trim().min(1).max(200).refine(s => !/[\r\n]/.test(s)),
  text: z.string().trim().min(1).max(20000),
}).strict();
export type EmailEnvelope = z.infer<typeof emailEnvelopeSchema>;
export type EmailApproval = { digest: string; approvedBy: string; approvedAt: string };

export function emailDigest(candidate: EmailEnvelope) {
  const email = emailEnvelopeSchema.parse(candidate);
  return createHash('sha256').update(JSON.stringify({
    id: email.id, recipients: [...new Set(email.recipients)].sort(),
    subject: email.subject, text: email.text,
  })).digest('hex');
}

export function approveEmail(candidate: EmailEnvelope, user: { id: string; email: string; mode: string } | null): EmailApproval {
  if (!canManageToolbox(user)) throw new Error('RCV3_EMAIL_APPROVAL_REQUIRED');
  return { digest: emailDigest(candidate), approvedBy: user!.id, approvedAt: new Date().toISOString() };
}

// Call only with an approval loaded from service-role-only storage, never from
// a request body, model response, user metadata, or customer-editable storage.
export function requireEmailApproval(candidate: EmailEnvelope, approval: EmailApproval | null) {
  const digest = emailDigest(candidate);
  if (!approval?.approvedBy || !Number.isFinite(Date.parse(approval.approvedAt)) ||
      !/^[a-f0-9]{64}$/.test(approval.digest) ||
      !timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(approval.digest, 'hex'))) {
    throw new Error('RCV3_EMAIL_APPROVAL_REQUIRED');
  }
}

// Fail closed. No broad "billing", "account", "AI approved", or template-wide
// exception. Card notices must be generated from verified current Stripe data
// by the dedicated card-reminder worker, not arbitrary submitted email text.
export const AUTOMATIC_EMAIL_TYPES = ['card_expiring', 'card_expired'] as const;
