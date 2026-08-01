import * as React from 'react';
import { formatCurrency, normalizeCurrencyCode } from '@/lib/currency';

type InvoiceEmailProps = {
  customerName: string;
  serviceName: string;
  dueDate: string;
  baseAmount: number;
  taxAmount: number;
  taxRatePercent?: number;
  currencyCode?: string;
  totalAmount: number;
  paymentUrl?: string;
  organizationName?: string;
  organizationSlogan?: string;
  organizationLogoUrl?: string;
};

export default function InvoiceEmail({
  customerName,
  serviceName,
  dueDate,
  baseAmount,
  taxAmount,
  taxRatePercent = 8.25,
  currencyCode = 'USD',
  totalAmount,
  paymentUrl,
  organizationName = 'Prado Systems',
  organizationSlogan = 'Field Service Software',
  organizationLogoUrl = '',
}: InvoiceEmailProps) {
  const normalizedCurrency = normalizeCurrencyCode(currencyCode);
  const safeTaxRatePercent = Number.isFinite(taxRatePercent) ? Number(taxRatePercent) : 8.25;
  const headerTitle = organizationName?.trim() || 'Prado Systems';
  const safeCustomerName = customerName?.trim() || 'Customer';
  const safeServiceName = serviceName?.trim() || 'General Service';
  const invoiceDate = dueDate?.trim() || 'N/A';
  const baseStr = formatCurrency(baseAmount, normalizedCurrency);
  const taxStr = formatCurrency(taxAmount, normalizedCurrency);
  const totalStr = formatCurrency(totalAmount, normalizedCurrency);
  const footerYear = new Date().getFullYear();

  return (
    <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', backgroundColor: '#f8fafc', margin: 0, padding: '20px', color: '#1e293b' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ background: '#009966', padding: '24px', textAlign: 'center', color: '#ffffff' }}>
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
          <div style={{ display: 'inline-block', background: '#E6F4EA', color: '#009966', fontWeight: 'bold', padding: '6px 12px', borderRadius: 20, fontSize: 12, marginTop: 8 }}>
            OFFICIAL INVOICE
          </div>
        </div>

        <div style={{ padding: '28px' }}>
          <h2 style={{ margin: '0 0 12px 0' }}>Invoice for {safeCustomerName}</h2>
          <p style={{ margin: '0 0 12px 0' }}><strong>Invoice Date:</strong> {invoiceDate}</p>

          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0' }}>
            <thead>
              <tr>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, textTransform: 'uppercase', color: '#64748b' }}>
                  Description
                </th>
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, textTransform: 'uppercase', color: '#64748b' }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>{safeServiceName} (Service Completed)</td>
                <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{baseStr}</td>
              </tr>
              <tr>
                <td style={{ padding: 12, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>{`Sales Tax / Service Fees (${safeTaxRatePercent.toFixed(2)}%)`}</td>
                <td style={{ padding: 12, textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{taxStr}</td>
              </tr>
              <tr>
                <td style={{ padding: 12, textAlign: 'left', fontSize: 16, fontWeight: 700, color: '#009966', borderTop: '2px solid #009966' }}>TOTAL DUE</td>
                <td style={{ padding: 12, textAlign: 'right', fontSize: 16, fontWeight: 700, color: '#009966', borderTop: '2px solid #009966' }}>{totalStr}</td>
              </tr>
            </tbody>
          </table>

          <p style={{ margin: '0 0 12px 0' }}>Please review and submit your payment at your earliest convenience.</p>
          <p style={{ margin: 0 }}>Thank you for your business!</p>

          {paymentUrl ? (
            <div style={{ marginTop: 16 }}>
              <a
                href={paymentUrl}
                style={{
                  display: 'inline-block',
                  background: '#009966',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '10px 16px',
                  borderRadius: 8,
                }}
              >
                Pay Invoice
              </a>
            </div>
          ) : null}

          <p style={{ margin: '12px 0 0 0', fontSize: 12, color: '#64748b' }}>{organizationSlogan}</p>
        </div>

        <div style={{ background: '#f8fafc', padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
          &copy; {footerYear} {organizationName}. All rights reserved.
        </div>
      </div>
    </div>
  );
}