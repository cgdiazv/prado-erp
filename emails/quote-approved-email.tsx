import * as React from 'react';
import { formatDocumentNumber, normalizeDocumentEmailHeaderColor } from '@/lib/documentBranding';
import { formatCurrency, normalizeCurrencyCode, SupportedCurrencyCode } from '@/lib/currency';
import { LineItem, parseEstimateDescription } from '@/emails/estimate-email';

export type { LineItem };

type EstimateLike = {
  id?: string;
  title?: string;
  estimated_amount?: number;
  description?: string | null;
  created_at?: string;
  estimate_number?: number | null;
  payment_terms?: string | null;
};

export type QuoteApprovedEmailProps = {
  customerName: string;
  estimate: EstimateLike;
  scheduledDate: string;
  serviceLocation?: string | null;
  truckName?: string | null;
  calendarUrl?: string | null;
  organizationName?: string;
  organizationSlogan?: string;
  organizationLogoUrl?: string;
  headerColor?: string;
  currencyCode?: string;
  paymentTerms?: string | null;
  lineItems?: LineItem[];
  notes?: string | null;
};

function formatDate(value: string | null | undefined, locale = 'en-US') {
  if (!value) return null;
  const d = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export default function QuoteApprovedEmail({
  customerName,
  estimate,
  scheduledDate,
  serviceLocation,
  truckName,
  calendarUrl,
  organizationName = 'Prado Systems',
  organizationSlogan = '',
  organizationLogoUrl = '',
  headerColor = '#009966',
  currencyCode = 'USD',
  paymentTerms = estimate?.payment_terms,
  lineItems: explicitLineItems,
  notes: explicitNotes,
}: QuoteApprovedEmailProps) {
  const normalizedCurrency: SupportedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const totalAmount = Number(estimate?.estimated_amount || 0);
  const serviceTitle = estimate?.title?.trim() || 'General Service';
  const safeCustomerName = customerName?.trim() || 'Customer';
  const headerTitle = organizationName?.trim() || 'Prado Systems';
  const fallbackInitial = headerTitle.charAt(0).toUpperCase() || 'P';
  const footerYear = new Date().getFullYear();
  const normalizedHeaderColor = normalizeDocumentEmailHeaderColor(headerColor);
  const formattedEstimateNumber = formatDocumentNumber('estimate', estimate?.estimate_number);
  const formattedScheduledDate = formatDate(scheduledDate) || scheduledDate?.trim() || 'To be determined';

  // Parse items from description if not explicitly provided
  const parsed =
    explicitLineItems && explicitLineItems.length > 0
      ? { lineItems: explicitLineItems, notes: explicitNotes || '' }
      : parseEstimateDescription(estimate?.description);

  const activeLineItems: LineItem[] =
    parsed.lineItems.length > 0
      ? parsed.lineItems
      : [
          {
            name: serviceTitle,
            price: totalAmount,
            quantity: 1,
            subtitle: 'Approved quoted service item',
          },
        ];

  const subtotal = activeLineItems.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );
  const finalTotal = totalAmount > 0 ? totalAmount : subtotal;
  const subtotalStr = formatCurrency(subtotal > 0 ? subtotal : finalTotal, normalizedCurrency);
  const grandTotalStr = formatCurrency(finalTotal, normalizedCurrency);
  const displayNotes = explicitNotes ?? parsed.notes;

  return (
    <div
      style={{
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        backgroundColor: '#f8fafc',
        margin: 0,
        padding: '24px 12px',
        color: '#1e293b',
      }}
    >
      <div
        style={{
          maxWidth: 620,
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        }}
      >
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
                      style={{
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        width: 42,
                        height: 42,
                        marginRight: 12,
                        borderRadius: 8,
                        objectFit: 'contain',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        padding: 2,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        width: 42,
                        height: 42,
                        lineHeight: '42px',
                        borderRadius: 8,
                        background: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        color: normalizedHeaderColor,
                        fontSize: 18,
                        fontWeight: 800,
                        textAlign: 'center',
                        marginRight: 12,
                      }}
                    >
                      {fallbackInitial}
                    </div>
                  )}
                  <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <h1
                      style={{
                        margin: 0,
                        fontSize: 20,
                        fontWeight: 700,
                        color: '#0f172a',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {headerTitle}
                    </h1>
                    {organizationSlogan?.trim() ? (
                      <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                        {organizationSlogan.trim()}
                      </p>
                    ) : null}
                  </div>
                </td>
                <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                  <div style={{ display: 'inline-block', textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: normalizedHeaderColor,
                        letterSpacing: '0.05em',
                      }}
                    >
                      QUOTE APPROVED
                    </span>
                    {formattedEstimateNumber ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginTop: 2 }}>
                        # {formattedEstimateNumber}
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
            Great news! Your quote has been approved and converted into a scheduled service job. Below is the complete confirmation and breakdown of your scheduled service:
          </p>

          {/* Status Callout Banner */}
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: '16px 20px',
              marginBottom: '24px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'middle', width: 32 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        background: '#16a34a',
                        color: '#ffffff',
                        textAlign: 'center',
                        lineHeight: '26px',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      &#10003;
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'middle', paddingLeft: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>
                      Service Confirmed &amp; Scheduled
                    </div>
                    <div style={{ fontSize: 12, color: '#15803d', marginTop: 2 }}>
                      Scheduled for <strong>{formattedScheduledDate}</strong>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quote & Schedule Overview Box */}
          <div
            style={{
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              padding: '16px',
              marginBottom: '24px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {formattedEstimateNumber ? (
                  <tr>
                    <td style={{ padding: '4px 8px 4px 0', color: '#64748b', width: '32%' }}>
                      <strong>Quote #:</strong>
                    </td>
                    <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                      {formattedEstimateNumber}
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b', width: '32%' }}>
                    <strong>Scheduled Service:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                    {serviceTitle}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b' }}>
                    <strong>Scheduled Date:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                    {formattedScheduledDate}
                  </td>
                </tr>
                {serviceLocation ? (
                  <tr>
                    <td style={{ padding: '4px 8px 4px 0', color: '#64748b' }}>
                      <strong>Service Location:</strong>
                    </td>
                    <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                      {serviceLocation}
                    </td>
                  </tr>
                ) : null}
                {truckName ? (
                  <tr>
                    <td style={{ padding: '4px 8px 4px 0', color: '#64748b' }}>
                      <strong>Assigned Vehicle:</strong>
                    </td>
                    <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                      {truckName}
                    </td>
                  </tr>
                ) : null}
                {paymentTerms ? (
                  <tr>
                    <td style={{ padding: '4px 8px 4px 0', color: '#64748b' }}>
                      <strong>Payment Terms:</strong>
                    </td>
                    <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                      {paymentTerms}
                    </td>
                  </tr>
                ) : null}
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

          {/* Line Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    borderTop: '1px solid #e2e8f0',
                    borderBottom: '1px solid #e2e8f0',
                    borderTopLeftRadius: 6,
                  }}
                >
                  DESCRIPTION
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    borderTop: '1px solid #e2e8f0',
                    borderBottom: '1px solid #e2e8f0',
                    width: 50,
                  }}
                >
                  QTY
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    borderTop: '1px solid #e2e8f0',
                    borderBottom: '1px solid #e2e8f0',
                    width: 95,
                  }}
                >
                  UNIT PRICE
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    borderTop: '1px solid #e2e8f0',
                    borderBottom: '1px solid #e2e8f0',
                    width: 95,
                    borderTopRightRadius: 6,
                  }}
                >
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
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        borderBottom: '1px solid #e2e8f0',
                        verticalAlign: 'middle',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        {item.subtitle || 'Approved quoted service item'}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontSize: 13,
                        color: '#334155',
                        borderBottom: '1px solid #e2e8f0',
                        verticalAlign: 'middle',
                      }}
                    >
                      {qty}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        fontSize: 13,
                        color: '#334155',
                        borderBottom: '1px solid #e2e8f0',
                        verticalAlign: 'middle',
                      }}
                    >
                      {formatCurrency(item.price, normalizedCurrency)}
                    </td>
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'right',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#0f172a',
                        borderBottom: '1px solid #e2e8f0',
                        verticalAlign: 'middle',
                      }}
                    >
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
                      Quoted Subtotal:
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      {subtotalStr}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td></td>
                  <td style={{ textAlign: 'right', paddingTop: 8 }}>
                    <div
                      style={{
                        display: 'inline-block',
                        width: '100%',
                        boxSizing: 'border-box',
                        border: `1.5px solid ${normalizedHeaderColor}`,
                        borderRadius: 6,
                        background: '#f0fdf4',
                        padding: '10px 14px',
                      }}
                    >
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td
                              style={{
                                textAlign: 'left',
                                fontSize: 14,
                                fontWeight: 800,
                                color: normalizedHeaderColor,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                              }}
                            >
                              TOTAL APPROVED:
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontSize: 17,
                                fontWeight: 800,
                                color: normalizedHeaderColor,
                              }}
                            >
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

          {/* Notes / Scope of Work (if present) */}
          {displayNotes && displayNotes.trim() ? (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                padding: '14px 16px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 6,
                }}
              >
                NOTES / SCOPE OF WORK
              </div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: '20px', whiteSpace: 'pre-wrap' }}>
                {displayNotes.trim()}
              </div>
            </div>
          ) : null}

          {/* Calendar CTA Button */}
          {calendarUrl ? (
            <div style={{ textAlign: 'center', margin: '24px 0 20px 0' }}>
              <a
                href={calendarUrl}
                style={{
                  display: 'inline-block',
                  background: normalizedHeaderColor,
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  padding: '12px 28px',
                  borderRadius: 8,
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
                }}
              >
                Add to Calendar &rarr;
              </a>
            </div>
          ) : null}

          {/* Action Note */}
          <p style={{ margin: '0 0 12px 0', fontSize: 14, lineHeight: '22px', color: '#475569' }}>
            Our team will arrive as scheduled. If you need to make any changes or have any questions, feel free to reply directly to this email.
          </p>
          <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#0f172a' }}>
            Thank you for choosing <strong>{headerTitle}</strong>!
          </p>
          <p style={{ margin: '16px 0 0 0', fontSize: 14, color: '#64748b' }}>
            Best regards,<br />
            <strong>The {headerTitle} Team</strong>
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            background: '#f8fafc',
            padding: '16px',
            textAlign: 'center',
            fontSize: 12,
            color: '#64748b',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          &copy; {footerYear} {headerTitle}. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export const EstimateApprovedEmail = QuoteApprovedEmail;
