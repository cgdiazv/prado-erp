import * as React from 'react';
import { formatCurrency, normalizeCurrencyCode } from '@/lib/currency';

type InvoicePaidEmailProps = {
  customerName: string;
  invoiceId: string;
  paidDate: string;
  totalPaid: number;
  currencyCode?: string;
  organizationName?: string;
  organizationSlogan?: string;
  organizationLogoUrl?: string;
};

export default function InvoicePaidEmail({
  customerName,
  invoiceId,
  paidDate,
  totalPaid,
  currencyCode = 'USD',
  organizationName = 'Prado Systems',
  organizationSlogan = 'Field Service Software',
  organizationLogoUrl = '',
}: InvoicePaidEmailProps) {
  const normalizedCurrency = normalizeCurrencyCode(currencyCode);
  const safeCustomerName = customerName?.trim() || 'Customer';
  const headerTitle = organizationName?.trim() || 'Prado Systems';
  const amountStr = formatCurrency(Number(totalPaid || 0), normalizedCurrency);
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
          <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>Invoice Payment Confirmation</p>
          <div style={{ display: 'inline-block', background: '#E6F4EA', color: '#009966', fontWeight: 'bold', padding: '6px 12px', borderRadius: 20, fontSize: 12, marginTop: 8 }}>
            PAYMENT RECEIVED
          </div>
        </div>

        <div style={{ padding: '28px' }}>
          <h2 style={{ margin: '0 0 12px 0' }}>Hello {safeCustomerName},</h2>
          <p style={{ margin: '0 0 16px 0' }}>
            We are pleased to confirm that your invoice payment has been successfully received.
          </p>

          <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '16px', margin: '20px 0' }}>
            <p style={{ margin: '0 0 8px 0' }}><strong>Invoice ID:</strong> {invoiceId}</p>
            <p style={{ margin: '0 0 8px 0' }}><strong>Payment Date:</strong> {paidDate}</p>
            <p style={{ margin: 0 }}><strong>Total Paid:</strong> <span style={{ color: '#009966', fontWeight: 700 }}>{amountStr}</span></p>
          </div>

          <p style={{ margin: '0 0 12px 0' }}>Your account balance for this invoice is now settled. Thank you for your business.</p>
          <p style={{ margin: 0 }}>Best regards,<br /><strong>{organizationName} Team</strong></p>
          <p style={{ margin: '12px 0 0 0', fontSize: 12, color: '#64748b' }}>{organizationSlogan}</p>
        </div>

        <div style={{ background: '#f8fafc', padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
          &copy; {footerYear} {organizationName}. All rights reserved.
        </div>
      </div>
    </div>
  );
}
