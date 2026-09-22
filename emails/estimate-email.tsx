import * as React from 'react';
import { formatDocumentNumber, normalizeDocumentEmailHeaderColor } from '@/lib/documentBranding';
import { formatCurrency, normalizeCurrencyCode, SupportedCurrencyCode } from '@/lib/currency';

export type LineItem = {
  name: string;
  price: number;
  quantity?: number;
  subtitle?: string;
};

type EstimateLike = {
  title?: string;
  estimated_amount?: number;
  description?: string | null;
  created_at?: string;
  estimate_number?: number | null;
  payment_terms?: string | null;
};

type EstimateEmailProps = {
  customerName: string;
  estimate: EstimateLike;
  organizationSlogan?: string;
  organizationName?: string;
  organizationLogoUrl?: string;
  headerColor?: string;
  paymentTerms?: string | null;
  currencyCode?: string;
  lineItems?: LineItem[];
  notes?: string | null;
};

export function parseEstimateDescription(rawDescription: string | null | undefined) {
  const text = (rawDescription || '').trim();
  const breakdownLabels = [
    'Detalle de servicios:',
    'Service breakdown:',
    'Detalle de Servicios:',
    'Service Breakdown:',
  ];
  const breakdownLabel = breakdownLabels.find((label) => text.includes(label));

  let notes = text;
  let breakdownText = '';

  if (breakdownLabel) {
    const parts = text.split(breakdownLabel);
    notes = (parts[0] || '').trim();
    breakdownText = (parts.slice(1).join(breakdownLabel) || '').trim();
  }

  const items: LineItem[] = [];

  if (breakdownText) {
    const lines = breakdownText.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('- ')) continue;
      const cleaned = line.replace(/^-\s*/, '');
      const match = cleaned.match(/^(.*):\s*\$?([0-9]+(?:\.[0-9]+)?)$/);
      if (match) {
        const serviceName = (match[1] || '').trim();
        const servicePrice = Number.parseFloat(match[2] || '0');
        if (serviceName && Number.isFinite(servicePrice) && servicePrice > 0) {
          items.push({
            name: serviceName,
            price: servicePrice,
            quantity: 1,
            subtitle: 'Quoted service item',
          });
        }
      }
    }
  }

  // Fallback: If no breakdown header was present, inspect bullet lines matching "- Item: $Price"
  if (items.length === 0 && text) {
    const lines = text.split(/\r?\n/);
    const nonItemLines: string[] = [];
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const match = line.match(/^-\s*(.*?):\s*\$?([0-9]+(?:\.[0-9]+)?)$/);
      if (match) {
        const serviceName = (match[1] || '').trim();
        const servicePrice = Number.parseFloat(match[2] || '0');
        if (serviceName && Number.isFinite(servicePrice) && servicePrice > 0) {
          items.push({
            name: serviceName,
            price: servicePrice,
            quantity: 1,
            subtitle: 'Quoted service item',
          });
          continue;
        }
      }
      nonItemLines.push(rawLine);
    }
    if (items.length > 0) {
      notes = nonItemLines.join('\n').trim();
    }
  }

  return { lineItems: items, notes };
}

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

export default function EstimateEmail({
  customerName,
  estimate,
  organizationSlogan = 'Field Service Software',
  organizationName = 'Prado Systems',
  organizationLogoUrl = '',
  headerColor = '#009966',
  paymentTerms = estimate?.payment_terms,
  currencyCode = 'USD',
  lineItems: explicitLineItems,
  notes: explicitNotes,
}: EstimateEmailProps) {
  const normalizedCurrency: SupportedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const totalAmount = Number(estimate?.estimated_amount || 0);
  const estimateTitle = estimate?.title?.trim() || 'General Service';
  const safeCustomerName = customerName?.trim() || 'Customer';
  const headerTitle = organizationName?.trim() || 'Prado Systems';
  const footerYear = new Date().getFullYear();
  const normalizedHeaderColor = normalizeDocumentEmailHeaderColor(headerColor);
  const formattedEstimateNumber = formatDocumentNumber('estimate', estimate?.estimate_number);
  const formattedDate = formatDate(estimate?.created_at) || formatDate(new Date().toISOString());

  // Parse items from description if not explicitly provided
  const parsed = React.useMemo(() => {
    if (explicitLineItems && explicitLineItems.length > 0) {
      return { lineItems: explicitLineItems, notes: explicitNotes || '' };
    }
    return parseEstimateDescription(estimate?.description);
  }, [explicitLineItems, explicitNotes, estimate?.description]);

  const activeLineItems: LineItem[] =
    parsed.lineItems.length > 0
      ? parsed.lineItems
      : [
          {
            name: estimateTitle,
            price: totalAmount,
            quantity: 1,
            subtitle: 'Quoted service item',
          },
        ];

  const subtotal = activeLineItems.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0
  );
  // If subtotal is valid and positive, use it, otherwise fallback to totalAmount
  const finalTotal = totalAmount > 0 ? totalAmount : subtotal;
  const subtotalStr = formatCurrency(subtotal > 0 ? subtotal : finalTotal, normalizedCurrency);
  const grandTotalStr = formatCurrency(finalTotal, normalizedCurrency);
  const displayNotes = explicitNotes ?? parsed.notes;

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
                      style={{ display: 'inline-block', verticalAlign: 'middle', width: 42, height: 42, marginRight: 12, borderRadius: 8, objectFit: 'contain', background: '#ffffff', border: '1px solid #e2e8f0', padding: 2 }}
                    />
                  ) : null}
                  <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                    <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>{headerTitle}</h1>
                    {organizationSlogan ? (
                      <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>{organizationSlogan}</p>
                    ) : null}
                  </div>
                </td>
                <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                  <div style={{ display: 'inline-block', textAlign: 'right' }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: normalizedHeaderColor, letterSpacing: '0.05em' }}>
                      QUOTE
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
            We have prepared a detailed quote for your review. Below is the complete breakdown of the requested services:
          </p>

          {/* Quote Overview Box (Details) */}
          <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b', width: '32%' }}>
                    <strong>Quote Date:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                    {formattedDate}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 8px 4px 0', color: '#64748b' }}>
                    <strong>Service Title:</strong>
                  </td>
                  <td style={{ padding: '4px 0', color: '#0f172a', fontWeight: 600 }}>
                    {estimateTitle}
                  </td>
                </tr>
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

          {/* Detailed Line Items Table (Matches PDF layout) */}
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
                        {item.subtitle || 'Quoted service item'}
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
                    <div style={{ display: 'inline-block', width: '100%', boxSizing: 'border-box', border: `1.5px solid ${normalizedHeaderColor}`, borderRadius: 6, background: '#f0fdf4', padding: '10px 14px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <td style={{ textAlign: 'left', fontSize: 14, fontWeight: 800, color: normalizedHeaderColor, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                              TOTAL QUOTE:
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

          {/* Notes / Scope of Work (if present) */}
          {displayNotes && displayNotes.trim() ? (
            <div style={{ background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', padding: '14px 16px', marginBottom: '24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                NOTES / SCOPE OF WORK
              </div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: '20px', whiteSpace: 'pre-wrap' }}>
                {displayNotes.trim()}
              </div>
            </div>
          ) : null}

          {/* Action Note */}
          <p style={{ margin: '0 0 12px 0', fontSize: 14, lineHeight: '22px', color: '#475569' }}>
            If you approve this quote, please let us know or reply directly to this email to schedule your service.
          </p>
          <p style={{ margin: '0 0 16px 0', fontSize: 14, color: '#0f172a' }}>
            Thank you for choosing <strong>{organizationName}</strong>!
          </p>

        </div>

        {/* Footer */}
        <div style={{ background: '#f8fafc', padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
          &copy; {footerYear} {organizationName}. All rights reserved.
        </div>
      </div>
    </div>
  );
}