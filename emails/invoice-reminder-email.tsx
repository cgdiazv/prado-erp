import * as React from 'react';
import { formatCurrency, normalizeCurrencyCode, SupportedCurrencyCode } from '@/lib/currency';
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
  notes?: string | null;
};

function formatDate(value: string | null | undefined, locale = 'en-US') {
  if (!value) return null;
  const d = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

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
  notes = '',
}: InvoiceReminderEmailProps) {
  const normalizedCurrency: SupportedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const safeTaxRatePercent = Number.isFinite(taxRatePercent) ? Number(taxRatePercent) : 8.25;
  const headerTitle = organizationName?.trim() || 'Prado Systems';
  const safeCustomerName = customerName?.trim() || 'Customer';
  const safeServiceName = serviceName?.trim() || 'General Service';
  const formattedDueDate = formatDate(dueDate) || dueDate?.trim() || 'Upon Receipt';
  const baseStr = formatCurrency(baseAmount, normalizedCurrency);
  const taxStr = formatCurrency(taxAmount, normalizedCurrency);
  const totalStr = formatCurrency(totalAmount, normalizedCurrency);
  const footerYear = new Date().getFullYear();
  const normalizedHeaderColor = normalizeDocumentEmailHeaderColor(headerColor);
  const formattedInvoiceNumber = formatDocumentNumber('invoice', invoiceNumber);
  const isOverdue = daysOverdue > 0;
  const accentColor = isOverdue ? '#dc2626' : normalizedHeaderColor;

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
                      style={{ display: 'inline-block', verticalAlign: 'middle', width: 42, height: 42, marginRight: 12, objectFit: 'contain' }}
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
                    <span style={{ fontSize: 18, fontWeight: 800, color: accentColor, letterSpacing: '0.05em' }}>
                      {isOverdue ? 'OVERDUE INVOICE' : 'PAYMENT REMINDER'}
                    </span>
                    {formattedInvoiceNumber ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 2 }}>
                        # {formattedInvoiceNumber}
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
            This is a friendly reminder from <strong>{headerTitle}</strong> regarding {formattedInvoiceNumber ? <strong>Invoice #{formattedInvoiceNumber}</strong> : 'your invoice'} for <em>{safeServiceName}</em>.
            {isOverdue
              ? ` Our records indicate this balance was due on ${formattedDueDate} (${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} ago) and remains outstanding.`
              : ` This is a courtesy reminder that payment for this invoice is due on ${formattedDueDate}.`}
          </p>

          {/* Outstanding Balance Callout Banner */}
          <div style={{ backgroundColor: isOverdue ? '#fef2f2' : '#fffbeb', border: `1px solid ${isOverdue ? '#fecaca' : '#fde68a'}`, borderRadius: 8, padding: '16px 20px', marginBottom: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: isOverdue ? '#991b1b' : '#92400e', letterSpacing: '0.05em' }}>
              Outstanding Balance Due
            </span>
            <div style={{ fontSize: 26, fontWeight: 800, color: isOverdue ? '#b91c1c' : '#b45309', marginTop: 4 }}>
              {totalStr}
            </div>
            <div style={{ fontSize: 12, color: isOverdue ? '#7f1d1d' : '#78350f', marginTop: 4 }}>
              Due Date: <strong>{formattedDueDate}</strong> {isOverdue ? `(${daysOverdue} days overdue)` : ''}
            </div>
          </div>

          {/* Overview Box (Details) */}
          <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b', width: '32%' }}>
                    <strong>Due Date:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                    {formattedDueDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b' }}>
                    <strong>Status:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: isOverdue ? '#dc2626' : '#d97706', fontWeight: 700 }}>
                    {isOverdue ? `${daysOverdue} days overdue` : 'Payment Pending'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b' }}>
                    <strong>Service:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                    {safeServiceName}
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

          {/* Detailed Line Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', borderTopLeftRadius: 6 }}>
                  DESCRIPTION
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', width: 50 }}>
                  QTY
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', width: 95 }}>
                  UNIT PRICE
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', width: 95, borderTopRightRadius: 6 }}>
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: '#ffffff' }}>
                <td style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    {safeServiceName}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Pending invoice balance
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: 13, color: '#334155', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                  1
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: 13, color: '#334155', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                  {baseStr}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                  {baseStr}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Totals Section */}
          <div style={{ width: '100%', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '40%' }}></td>
                  <td style={{ width: '60%', textAlign: 'right', padding: '6px 0' }}>
                    <span style={{ fontSize: 13, color: '#64748b', marginRight: 16 }}>
                      Subtotal:
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      {baseStr}
                    </span>
                  </td>
                </tr>
                {taxAmount > 0 ? (
                  <tr>
                    <td></td>
                    <td style={{ textAlign: 'right', padding: '6px 0' }}>
                      <span style={{ fontSize: 13, color: '#64748b', marginRight: 16 }}>
                        Sales Tax ({safeTaxRatePercent.toFixed(2)}%):
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        {taxStr}
                      </span>
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td></td>
                  <td style={{ textAlign: 'right', paddingTop: 8 }}>
                    <div style={{ display: 'inline-block', width: '100%', boxSizing: 'border-box', border: `1.5px solid ${accentColor}`, borderRadius: 6, background: isOverdue ? '#fef2f2' : '#f0fdf4', padding: '10px 14px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td style={{ textAlign: 'left', fontSize: 14, fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                              TOTAL DUE:
                            </td>
                            <td style={{ textAlign: 'right', fontSize: 17, fontWeight: 800, color: accentColor }}>
                              {totalStr}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes (if present) */}
          {notes && notes.trim() ? (
            <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '14px 16px', marginBottom: '24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                PAYMENT INSTRUCTIONS
              </div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: '20px', whiteSpace: 'pre-wrap' }}>
                {notes.trim()}
              </div>
            </div>
          ) : null}

          {/* Payment CTA */}
          {paymentUrl ? (
            <div style={{ textAlign: 'center', margin: '28px 0 20px 0' }}>
              <a
                href={paymentUrl}
                style={{
                  display: 'inline-block',
                  background: accentColor,
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '12px 28px',
                  borderRadius: 8,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                }}
              >
                Pay Outstanding Balance &rarr;
              </a>
            </div>
          ) : null}

          {/* Action Note */}
          <p style={{ margin: '0 0 12px 0', fontSize: 14, lineHeight: '22px', color: '#475569' }}>
            If you have already submitted your payment, please disregard this message. If you have any questions or need payment options, please reply directly to this email.
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
