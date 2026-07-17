import * as React from 'react';

type InvoiceEmailProps = {
  customerName: string;
  serviceName: string;
  dueDate: string;
  baseAmount: number;
  taxAmount: number;
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
  totalAmount,
  paymentUrl,
  organizationName = 'Prado Systems',
  organizationSlogan = 'Field Service Software',
  organizationLogoUrl = '',
}: InvoiceEmailProps) {
  const fallbackInitial = organizationName.trim().charAt(0).toUpperCase() || 'P';

  return (
    <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', maxWidth: 600, margin: '20px auto', color: '#0f172a', padding: '10px' }}>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '32px', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', marginBottom: 32 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {organizationLogoUrl ? (
                    <img
                      src={organizationLogoUrl}
                      alt={`${organizationName} logo`}
                      width="22"
                      height="22"
                      style={{ width: 22, height: 22, borderRadius: 5, objectFit: 'contain', border: '1px solid #e2e8f0', background: '#ffffff', display: 'inline-block' }}
                    />
                  ) : (
                    <span style={{ display: 'inline-block', width: 22, height: 22, lineHeight: '22px', borderRadius: 5, background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', color: '#ffffff', fontSize: 11, fontWeight: 900, textAlign: 'center' }}>{fallbackInitial}</span>
                  )}
                  <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.025em', color: '#0f172a' }}>{organizationName}</span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>{organizationSlogan}</p>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 750, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>Due Date: {dueDate}</p>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginBottom: 32, background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8, padding: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Billed To:</span>
          <strong style={{ fontSize: 15, color: '#0f172a', display: 'block' }}>{customerName}</strong>
          <span style={{ fontSize: 12, color: '#475569', display: 'block', marginTop: 2 }}>{serviceName}</span>
        </div>

        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>Billing Breakdown</h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase', fontSize: 11, color: '#64748b', fontWeight: 700 }}>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>Description</th>
              <th style={{ textAlign: 'right', padding: '8px 0' }}>Amount</th>
            </tr>
          </thead>
          <tbody style={{ color: '#334155' }}>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px 0', fontWeight: 500 }}>{serviceName}</td>
              <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600 }}>${baseAmount.toFixed(2)}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px 0', color: '#475569' }}>Estimated Tax (8.25%)</td>
              <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600 }}>${taxAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid #0f172a', paddingTop: 16, marginBottom: 16 }}>
          <table style={{ width: '240px', fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ color: '#059669', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', verticalAlign: 'middle' }}>Total Due</td>
                <td style={{ textAlign: 'right', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>${totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {paymentUrl ? (
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <a
              href={paymentUrl}
              style={{
                display: 'inline-block',
                background: '#10b981',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14,
                padding: '12px 20px',
                borderRadius: 10,
              }}
            >
              Pay Invoice Online
            </a>
            <p style={{ margin: '12px 0 0 0', fontSize: 11, color: '#64748b', lineHeight: '16px' }}>
              Secure checkout powered by Stripe.
            </p>
          </div>
        ) : null}

        <div style={{ marginTop: 40, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: '16px' }}>
            <strong>Payment Terms:</strong> Payment is due upon receipt. If you have any questions about this invoice, please reply directly to this email.
          </p>
        </div>
      </div>

      <p style={{ marginTop: 20, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>
        This is an official document generated automatically by Prado Hub.
      </p>
    </div>
  );
}