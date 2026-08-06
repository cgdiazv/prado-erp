const DEFAULT_RESEND_FROM_EMAIL = 'notifications@pradocommerce.com';
const DEFAULT_RESEND_FROM_NAME = 'Prado Commerce';

export function getResendFromAddress({
  email,
  displayName = DEFAULT_RESEND_FROM_NAME,
}: {
  email?: string | null;
  displayName?: string | null;
} = {}) {
  const resolvedEmail = (email || process.env.RESEND_FROM_EMAIL || DEFAULT_RESEND_FROM_EMAIL).trim();
  const resolvedDisplayName = (displayName || DEFAULT_RESEND_FROM_NAME).trim() || DEFAULT_RESEND_FROM_NAME;

  return `${resolvedDisplayName} <${resolvedEmail}>`;
}
