import * as React from 'react';
import { formatCurrency, normalizeCurrencyCode } from '@/lib/currency';
import { normalizeDocumentEmailHeaderColor } from '@/lib/documentBranding';

type JobCompletedEmailProps = {
  customerName: string;
  jobType: string;
  completedDate: string;
  address?: string | null;
  baseAmount: number;
  taxAmount: number;
  taxRatePercent?: number;
  currencyCode?: string;
  totalAmount: number;
  organizationName?: string;
  organizationSlogan?: string;
  organizationLogoUrl?: string;
  headerColor?: string;
  photos?: string[];
  completionNotes?: string | null;
};

export default function JobCompletedEmail({
  customerName,
  jobType,
  completedDate,
  address,
  baseAmount,
  taxAmount,
  taxRatePercent = 8.25,
  currencyCode = 'USD',
  totalAmount,
  organizationName = 'Prado Systems',
  organizationSlogan = '',
  organizationLogoUrl = '',
  headerColor = '#009966',
  photos = [],
  completionNotes = '',
}: JobCompletedEmailProps) {
  const normalizedHeaderColor = normalizeDocumentEmailHeaderColor(headerColor);
  const normalizedCurrency = normalizeCurrencyCode(currencyCode);
  const computedTotal = Number(totalAmount || 0) > 0 ? Number(totalAmount || 0) : Number(baseAmount || 0) + Number(taxAmount || 0);
  const amountStr = formatCurrency(computedTotal, normalizedCurrency);
  const safeTaxRatePercent = Number.isFinite(taxRatePercent) ? Number(taxRatePercent) : 8.25;
  const formattedDate = new Date(completedDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const headerTitle = organizationName?.trim() || 'Prado Systems';
  const safeCustomerName = customerName?.trim() || 'Customer';
  const safeJobType = jobType?.trim() || 'General Service';
  const safeAddress = address?.trim() || 'On file with your customer profile';
  const footerYear = new Date().getFullYear();

  return (
    <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', backgroundColor: '#f8fafc', margin: 0, padding: '20px', color: '#1e293b' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ background: normalizedHeaderColor, padding: '24px', textAlign: 'center', color: '#ffffff' }}>
          {organizationLogoUrl ? (
            <img
              src={organizationLogoUrl}
              alt={`${headerTitle} logo`}
              width="44"
              height="44"
              style={{ display: 'block', width: 44, height: 44, margin: '0 auto 10px auto', borderRadius: 8, objectFit: 'contain', background: '#ffffff', padding: 4 }}
            />
          ) : null}
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{headerTitle}</h1>
          <div style={{ display: 'inline-block', background: '#ffffff', color: normalizedHeaderColor, fontWeight: 'bold', padding: '6px 12px', borderRadius: 20, fontSize: 12, marginTop: 8 }}>
            SERVICE COMPLETED
          </div>
        </div>

        <div style={{ padding: '28px' }}>
          <h2 style={{ margin: '0 0 12px 0' }}>Hello {safeCustomerName},</h2>
          <p style={{ margin: '0 0 16px 0' }}>
            We are pleased to inform you that your service job has been successfully <strong>COMPLETED</strong>.
          </p>

          <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '16px', margin: '20px 0' }}>
            <p style={{ margin: '0 0 8px 0' }}><strong>Completed Service:</strong> {safeJobType}</p>
            <p style={{ margin: '0 0 8px 0' }}><strong>Completion Date:</strong> {formattedDate}</p>
            <p style={{ margin: '0 0 8px 0' }}><strong>Service Location:</strong> {safeAddress}</p>
            <p style={{ margin: 0 }}><strong>Total Service Amount:</strong> {amountStr}</p>
          </div>

          {completionNotes?.trim() ? (
            <div style={{ background: '#f8fafc', borderLeft: `4px solid ${normalizedHeaderColor}`, padding: '12px 16px', margin: '16px 0', borderRadius: '0 8px 8px 0' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                <strong style={{ color: '#0f172a' }}>Technician Notes:</strong> {completionNotes.trim()}
              </p>
            </div>
          ) : null}

          {photos && photos.length > 0 ? (
            <div style={{ margin: '24px 0' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Completed Work Photos ({photos.length})
              </h3>
              <table role="presentation" border={0} cellPadding={0} cellSpacing={0} width="100%">
                <tbody>
                  <tr>
                    <td>
                      <div style={{ display: 'grid', gridTemplateColumns: photos.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                        {photos.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', borderRadius: 8, overflow: 'hidden', border: '1px solid #cbd5e1', textDecoration: 'none' }}
                          >
                            <img
                              src={url}
                              alt={`Completed work photo ${idx + 1}`}
                              style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                            />
                          </a>
                        ))}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p style={{ margin: '8px 0 0 0', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                Click any image to view full resolution. Photos are also attached to this email.
              </p>
            </div>
          ) : null}

          <p style={{ margin: '0 0 12px 0' }}>
            Your corresponding invoice is attached in a separate email. Thank you for your business!
          </p>
          <p style={{ margin: 0 }}>
            Best regards,<br /><strong>{organizationName} Team</strong>
          </p>
          {organizationSlogan?.trim() ? (
            <p style={{ margin: '12px 0 0 0', fontSize: 12, color: '#64748b' }}>{organizationSlogan.trim()}</p>
          ) : null}
          <p style={{ margin: '8px 0 0 0', fontSize: 11, color: '#94a3b8' }}>Reference tax rate: {safeTaxRatePercent.toFixed(2)}%</p>
        </div>

        <div style={{ background: '#f8fafc', padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
          &copy; {footerYear} {organizationName}. All rights reserved.
        </div>
      </div>
    </div>
  );
}
