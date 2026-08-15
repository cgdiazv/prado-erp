import * as React from 'react';
import { normalizeDocumentEmailHeaderColor } from '@/lib/documentBranding';

type WelcomeCustomerEmailProps = {
  customerName: string;
  organizationName?: string;
  organizationSlogan?: string;
  organizationLogoUrl?: string;
  headerColor?: string;
  companyName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export default function WelcomeCustomerEmail({
  customerName,
  organizationName = 'Prado Systems',
  organizationSlogan = 'Field Service Software',
  organizationLogoUrl = '',
  headerColor = '#009966',
  companyName,
  contactEmail,
  contactPhone,
}: WelcomeCustomerEmailProps) {
  const normalizedHeaderColor = normalizeDocumentEmailHeaderColor(headerColor);
  const headerTitle = organizationName?.trim() || 'Prado Systems';
  const safeCustomerName = customerName?.trim() || 'Valued Customer';
  const fallbackInitial = headerTitle.charAt(0).toUpperCase() || 'P';
  const footerYear = new Date().getFullYear();

  return (
    <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', backgroundColor: '#f8fafc', margin: 0, padding: '20px', color: '#1e293b' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        {/* Header */}
        <div style={{ background: normalizedHeaderColor, padding: '28px 24px', textAlign: 'center', color: '#ffffff' }}>
          {organizationLogoUrl ? (
            <img
              src={organizationLogoUrl}
              alt={`${headerTitle} logo`}
              width="48"
              height="48"
              style={{ display: 'block', width: 48, height: 48, margin: '0 auto 12px auto', borderRadius: 8, objectFit: 'contain', background: '#ffffff', padding: 4 }}
            />
          ) : (
            <div style={{ display: 'inline-block', width: 44, height: 44, lineHeight: '44px', borderRadius: 10, background: '#ffffff', color: normalizedHeaderColor, fontSize: 20, fontWeight: 900, textAlign: 'center', margin: '0 auto 12px auto' }}>
              {fallbackInitial}
            </div>
          )}
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em' }}>{headerTitle}</h1>
          {organizationSlogan ? (
            <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>{organizationSlogan}</p>
          ) : null}
          <div style={{ display: 'inline-block', background: '#ffffff', color: normalizedHeaderColor, fontWeight: 'bold', padding: '5px 14px', borderRadius: 20, fontSize: 11, marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Welcome to Our Family
          </div>
        </div>

        {/* Body Content */}
        <div style={{ padding: '32px 28px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 20, color: '#0f172a' }}>Hello {safeCustomerName},</h2>
          
          <p style={{ margin: '0 0 16px 0', fontSize: 15, lineHeight: '1.6', color: '#334155' }}>
            Welcome! We are excited to have you on board with <strong>{headerTitle}</strong>. We are committed to providing you with exceptional service and a seamless experience.
          </p>

          {companyName ? (
            <p style={{ margin: '0 0 16px 0', fontSize: 14, lineHeight: '1.5', color: '#475569' }}>
              We look forward to serving <strong>{companyName}</strong> and supporting all of your service requirements.
            </p>
          ) : null}

          {/* Info Box */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '20px', margin: '24px 0' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: normalizedHeaderColor }}>
              Getting in Touch
            </h3>
            <p style={{ margin: '0 0 8px 0', fontSize: 14, color: '#334155' }}>
              If you have any questions, need to schedule a service, or want to make inquiries, feel free to reply directly to this email.
            </p>
            {contactPhone ? (
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#475569' }}>
                <strong>Phone:</strong> {contactPhone}
              </p>
            ) : null}
            {contactEmail ? (
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#475569' }}>
                <strong>Email:</strong> {contactEmail}
              </p>
            ) : null}
          </div>

          <p style={{ margin: '0 0 8px 0', fontSize: 15, color: '#334155' }}>
            Thank you for choosing <strong>{headerTitle}</strong>!
          </p>

          <p style={{ margin: '20px 0 0 0', fontSize: 14, color: '#64748b' }}>
            Warm regards,<br />
            <strong>The {headerTitle} Team</strong>
          </p>
        </div>

        {/* Footer */}
        <div style={{ background: '#f8fafc', padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
          &copy; {footerYear} {headerTitle}. All rights reserved.
        </div>
      </div>
    </div>
  );
}
