import * as React from 'react';
import { formatCurrency, normalizeCurrencyCode } from '@/lib/currency';
import { formatDocumentNumber, normalizeDocumentEmailHeaderColor } from '@/lib/documentBranding';

export type InvoiceReminderEmailProps = {
  customerName: string;
  serviceName: string;
  dueDate: string;
  daysOverdue?: number;
  baseAmount: number;
  taxAmount: number;
  taxRatePercent?: number;
  currencyCode?: string;
  totalAmount: number;
  invoiceNumber?: number | null;
  paymentUrl?: string;
  organizationName?: string;
  organizationSlogan?: string;
  organizationLogoUrl?: string;
  headerColor?: string;
};

export default function InvoiceReminderEmail({
  customerName,
  serviceName,
  dueDate,
  daysOverdue = 0,
  baseAmount,
  taxAmount,
  taxRatePercent = 8.25,
  currencyCode = 'USD',
  totalAmount,
  invoiceNumber,
  paymentUrl,
  organizationName = 'Prado Systems',
  organizationSlogan = '',
  organizationLogoUrl = '',
  headerColor = '#009966',
}: InvoiceReminderEmailProps) {
  const normalizedCurrency = normalizeCurrencyCode(currencyCode);
  const safeTaxRatePercent = Number.isFinite(taxRatePercent) ? Number(taxRatePercent) : 8.25;
  const headerTitle = organizationName?.trim() || 'Prado Systems';
  const safeCustomerName = customerName?.trim() || 'Customer';
  const safeServiceName = serviceName?.trim() || 'General Service';
  const invoiceDueDate = dueDate?.trim() || 'N/A';
  const baseStr = formatCurrency(baseAmount, normalizedCurrency);
  const taxStr = formatCurrency(taxAmount, normalizedCurrency);
  const totalStr = formatCurrency(totalAmount, normalizedCurrency);
  const footerYear = new Date().getFullYear();
  const normalizedHeaderColor = normalizeDocumentEmailHeaderColor(headerColor);
  const formattedInvoiceNumber = formatDocumentNumber('invoice', invoiceNumber);

  return (
    <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', backgroundColor: '#f8fafc', margin: 0, padding: '24px', color: '#1e293b' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        
        {/* Header Branding */}
        <div style={{ background: normalizedHeaderColor, padding: '28px 24px', textAlign: 'center', color: '#ffffff' }}>
          {organizationLogoUrl ? (
            <img
              src={organizationLogoUrl}
              alt={`${headerTitle} logo`}
              width="48"
              height="48"
              style={{ display: 'block', width: 48, height: 48, margin: '0 auto 12px auto', borderRadius: 10, objectFit: 'contain', background: '#ffffff', padding: 4 }}
            />
          ) : null}
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{headerTitle}</h1>
          <div style={{ display: 'inline-block', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 800, padding: '5px 14px', borderRadius: 20, fontSize: 11, marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Payment Reminder &bull; Overdue
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '32px 28px' }}>
          <h2 style={{ margin: '0 0 10px 0', fontSize: 18, color: '#0f172a', fontWeight: 700 }}>
            Payment Reminder for {safeCustomerName}
          </h2>
          
          <p style={{ margin: '0 0 18px 0', fontSize: 14, lineHeight: '1.6', color: '#475569' }}>
            This is a friendly reminder from <strong>{headerTitle}</strong> regarding {formattedInvoiceNumber ? <strong>Invoice {formattedInvoiceNumber}</strong> : 'your invoice'} for <em>{safeServiceName}</em>.
            {daysOverdue > 0 ? ` Our records show this balance was due on ${invoiceDueDate} (${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} ago) and is currently pending.` : ` Our records indicate this invoice was due on ${invoiceDueDate} and remains unpaid.`}
          </p>

          {/* Outstanding Balance Callout Banner */}
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '16px 20px', margin: '20px 0', textAlign: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#92400e', letterSpacing: '0.05em' }}>
              Outstanding Balance Due
            </span>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#b45309', marginTop: 4 }}>
              {totalStr}
            </div>
            <div style={{ fontSize: 12, color: '#78350f', marginTop: 4 }}>
              Due Date: <strong>{invoiceDueDate}</strong>
            </div>
          </div>

          {/* Details Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '24px 0 20px 0' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 11, textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Description
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 11, textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: '#334155' }}>
                  {safeServiceName}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: '#334155', fontWeight: 600 }}>
                  {baseStr}
                </td>
              </tr>
              {taxAmount > 0 && (
                <tr>
                  <td style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: '#64748b' }}>
                    Sales Tax ({safeTaxRatePercent.toFixed(2)}%)
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', fontSize: 13, color: '#64748b' }}>
                    {taxStr}
                  </td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '14px 12px', textAlign: 'left', fontSize: 15, fontWeight: 800, color: normalizedHeaderColor, borderTop: `2px solid ${normalizedHeaderColor}` }}>
                  TOTAL DUE
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontSize: 15, fontWeight: 800, color: normalizedHeaderColor, borderTop: `2px solid ${normalizedHeaderColor}` }}>
                  {totalStr}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Payment CTA */}
          {paymentUrl ? (
            <div style={{ textAlign: 'center', margin: '28px 0 16px 0' }}>
              <a
                href={paymentUrl}
                style={{
                  display: 'inline-block',
                  background: normalizedHeaderColor,
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '14px 28px',
                  borderRadius: 8,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                }}
              >
                Pay Outstanding Balance Now &rarr;
              </a>
            </div>
          ) : null}

          <p style={{ margin: '20px 0 0 0', fontSize: 12, lineHeight: '1.5', color: '#64748b' }}>
            If payment has already been sent, please disregard this reminder. If you have any questions or require an updated statement, please feel free to reach out to us directly.
          </p>

          {organizationSlogan?.trim() ? (
            <p style={{ margin: '14px 0 0 0', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
              {organizationSlogan.trim()}
            </p>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ background: '#f8fafc', padding: '16px', textAlign: 'center', fontSize: 12, color: '#94a3b8', borderTop: '1px solid #e2e8f0' }}>
          &copy; {footerYear} {headerTitle}. All rights reserved.
        </div>
      </div>
    </div>
  );
}
