import * as React from 'react';
import { formatCurrency, normalizeCurrencyCode, SupportedCurrencyCode } from '@/lib/currency';
import { normalizeDocumentEmailHeaderColor } from '@/lib/documentBranding';

export type LineItem = {
  name: string;
  price: number;
  quantity?: number;
  subtitle?: string;
};

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
  jobNumber?: number | string | null;
  lineItems?: LineItem[];
};

function formatDate(value: string | null | undefined, locale = 'en-US') {
  if (!value) return null;
  const d = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

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
  jobNumber,
  lineItems: explicitLineItems,
}: JobCompletedEmailProps) {
  const normalizedHeaderColor = normalizeDocumentEmailHeaderColor(headerColor);
  const normalizedCurrency: SupportedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const computedTotal = Number(totalAmount || 0) > 0 ? Number(totalAmount || 0) : Number(baseAmount || 0) + Number(taxAmount || 0);
  const safeTaxRatePercent = Number.isFinite(taxRatePercent) ? Number(taxRatePercent) : 8.25;
  const formattedDate = formatDate(completedDate) || completedDate;
  const headerTitle = organizationName?.trim() || 'Prado Systems';
  const safeCustomerName = customerName?.trim() || 'Customer';
  const safeJobType = jobType?.trim() || 'General Service';
  const safeAddress = address?.trim() || 'On file with your customer profile';
  const footerYear = new Date().getFullYear();

  const formattedJobNumber =
    typeof jobNumber === 'number'
      ? `JOB-${String(jobNumber).padStart(4, '0')}`
      : jobNumber ? String(jobNumber) : null;

  const activeLineItems: LineItem[] =
    explicitLineItems && explicitLineItems.length > 0
      ? explicitLineItems
      : [
          {
            name: safeJobType,
            price: Number(baseAmount || 0),
            quantity: 1,
            subtitle: 'Completed service job',
          },
        ];

  const subtotal = activeLineItems.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );
  const finalSubtotal = subtotal > 0 ? subtotal : Number(baseAmount || 0);
  const subtotalStr = formatCurrency(finalSubtotal, normalizedCurrency);
  const taxStr = formatCurrency(taxAmount, normalizedCurrency);
  const grandTotalStr = formatCurrency(computedTotal > 0 ? computedTotal : finalSubtotal + taxAmount, normalizedCurrency);

  return (
    <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', backgroundColor: '#f8fafc', margin: 0, padding: '24px 12px', color: '#1e293b' }}>
      <div style={{ maxWidth: 620, margin: '0 auto', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>

        {/* Top Accent Band */}
        <div style={{ background: normalizedHeaderColor, height: 6, width: '100%' }} />

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
                    <span style={{ fontSize: 20, fontWeight: 800, color: normalizedHeaderColor, letterSpacing: '0.05em' }}>
                      JOB COMPLETED
                    </span>
                    {formattedJobNumber ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 2 }}>
                        # {formattedJobNumber}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>
                        &#10003; SERVICE FINALIZED
                      </div>
                    )}
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
            We are pleased to inform you that your service job has been successfully <strong>COMPLETED</strong>. Below is the complete summary of the finished work:
          </p>

          {/* Job Overview Box (Details) */}
          <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b', width: '32%' }}>
                    <strong>Completion Date:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                    {formattedDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b' }}>
                    <strong>Job Service:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                    {safeJobType}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b' }}>
                    <strong>Service Location:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                    {safeAddress}
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
              {activeLineItems.map((item, idx) => {
                const qty = item.quantity || 1;
                const lineAmount = item.price * qty;
                const isEven = idx % 2 === 0;
                return (
                  <tr key={idx} style={{ backgroundColor: isEven ? '#ffffff' : '#fcfdfd' }}>
                    <td style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {item.subtitle || 'Completed service job'}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontSize: 13, color: '#334155', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                      {qty}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: 13, color: '#334155', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                      {formatCurrency(item.price, normalizedCurrency)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #e2e8f0', verticalAlign: 'middle' }}>
                      {formatCurrency(lineAmount, normalizedCurrency)}
                    </td>
                  </tr>
                );
              })}
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
                      Service Subtotal:
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      {subtotalStr}
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
                    <div style={{ display: 'inline-block', width: '100%', boxSizing: 'border-box', border: `1.5px solid ${normalizedHeaderColor}`, borderRadius: 6, background: '#f0fdf4', padding: '10px 14px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td style={{ textAlign: 'left', fontSize: 14, fontWeight: 800, color: normalizedHeaderColor, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                              TOTAL JOB AMOUNT:
                            </td>
                            <td style={{ textAlign: 'right', fontSize: 17, fontWeight: 800, color: normalizedHeaderColor }}>
                              {grandTotalStr}
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

          {/* Technician Notes (if present) */}
          {completionNotes && completionNotes.trim() ? (
            <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '14px 16px', marginBottom: '24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                TECHNICIAN NOTES
              </div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: '20px', whiteSpace: 'pre-wrap' }}>
                {completionNotes.trim()}
              </div>
            </div>
          ) : null}

          {/* Completed Work Photos (if present) */}
          {photos && photos.length > 0 ? (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                COMPLETED WORK PHOTOS ({photos.length})
              </div>
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
                            style={{ display: 'block', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', textDecoration: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
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

          {/* Action Note */}
          <p style={{ margin: '0 0 12px 0', fontSize: 14, lineHeight: '22px', color: '#475569' }}>
            Your corresponding invoice is available and can be reviewed or paid at your convenience.
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
