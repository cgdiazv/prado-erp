import * as React from 'react';
import { formatCurrency, normalizeCurrencyCode, SupportedCurrencyCode } from '@/lib/currency';
import { normalizeDocumentEmailHeaderColor } from '@/lib/documentBranding';

type InvoicePaidEmailProps = {
  customerName: string;
  invoiceId: string;
  paidDate: string;
  totalPaid: number;
  currencyCode?: string;
  organizationName?: string;
  organizationSlogan?: string;
  organizationLogoUrl?: string;
  headerColor?: string;
};

export default function InvoicePaidEmail({
  customerName,
  invoiceId,
  paidDate,
  totalPaid,
  currencyCode = 'USD',
  organizationName = 'Prado Systems',
  organizationSlogan = '',
  organizationLogoUrl = '',
  headerColor = '#009966',
}: InvoicePaidEmailProps) {
  const normalizedCurrency: SupportedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const accentColor = headerColor ? normalizeDocumentEmailHeaderColor(headerColor) : '#16a34a';
  const safeCustomerName = customerName?.trim() || 'Customer';
  const headerTitle = organizationName?.trim() || 'Prado Systems';
  const amountStr = formatCurrency(Number(totalPaid || 0), normalizedCurrency);
  const footerYear = new Date().getFullYear();

  return (
    <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', backgroundColor: '#f8fafc', margin: 0, padding: '24px 12px', color: '#1e293b' }}>
      <div style={{ maxWidth: 620, margin: '0 auto', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>

        {/* Top Accent Band */}
        <div style={{ background: accentColor, height: 6, width: '100%' }} />

        {/* Header Section */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ verticalAlign: 'middle', textAlign: 'left' }}>
                  {organizationLogoUrl ? (
                    <img
                      src={organizationLogoUrl}
                      alt={`${headerTitle} logo`}
                      width="42"
                      height="42"
                      style={{ display: 'inline-block', verticalAlign: 'middle', width: 42, height: 42, marginRight: 12, borderRadius: 8, objectFit: 'contain', background: '#ffffff', border: '1px solid #e2e8f0', padding: 2 }}
                    />
                  ) : null}
                  <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>{headerTitle}</h1>
                    {organizationSlogan?.trim() ? (
                      <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>{organizationSlogan.trim()}</p>
                    ) : null}
                  </div>
                </td>
                <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                  <div style={{ display: 'inline-block', textAlign: 'right' }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: accentColor, letterSpacing: '0.05em' }}>
                      PAYMENT RECEIPT
                    </span>
                    {invoiceId ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 2 }}>
                        # {invoiceId}
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Content Section */}
        <div style={{ padding: '28px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 600, color: '#0f172a' }}>
            Hello {safeCustomerName},
          </h2>
          <p style={{ margin: '0 0 20px 0', fontSize: 14, lineHeight: '22px', color: '#475569' }}>
            We have successfully received your payment. Thank you for your business! Below is your official payment confirmation and receipt:
          </p>

          {/* Receipt Overview Box (Details) */}
          <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b', width: '32%' }}>
                    <strong>Payment Date:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                    {paidDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b' }}>
                    <strong>Invoice ID:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                    {invoiceId}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b' }}>
                    <strong>Payment Status:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: '#16a34a', fontWeight: 700 }}>
                    &#10003; Paid &bull; Fully Settled
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b' }}>
                    <strong>Currency:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                    {normalizedCurrency}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Amount Card */}
          <div style={{ width: '100%', marginBottom: '24px' }}>
            <div style={{ boxSizing: 'border-box', border: `1.5px solid ${accentColor}`, borderRadius: 6, background: '#f0fdf4', padding: '14px 18px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'left', fontSize: 14, fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      TOTAL AMOUNT PAID:
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 20, fontWeight: 800, color: accentColor }}>
                      {amountStr}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action / Confirmation Note */}
          <p style={{ margin: '0 0 12px 0', fontSize: 14, lineHeight: '22px', color: '#475569' }}>
            Your account balance for this invoice is now settled. A copy of this receipt has been saved to your records.
          </p>
          <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#0f172a' }}>
            Thank you for choosing <strong>{headerTitle}</strong>!
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
