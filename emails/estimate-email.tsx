import * as React from 'react';
import { formatDocumentNumber, normalizeDocumentEmailHeaderColor } from '@/lib/documentBranding';

type EstimateLike = {
  title?: string;
  estimated_amount?: number;
  description?: string | null;
  created_at?: string;
  estimate_number?: number | null;
};

type EstimateEmailProps = {
  customerName: string;
  estimate: EstimateLike;
  organizationSlogan?: string;
  organizationName?: string;
  organizationLogoUrl?: string;
  headerColor?: string;
};

export default function EstimateEmail({
  customerName,
  estimate,
  organizationSlogan = 'Field Service Software',
  organizationName = 'Prado Systems',
  organizationLogoUrl = '',
  headerColor = '#009966',
}: EstimateEmailProps) {
  const amount = Number(estimate?.estimated_amount || 0).toFixed(2);
  const estimateTitle = estimate?.title?.trim() || 'General Service';
  const safeCustomerName = customerName?.trim() || 'Customer';
  const headerTitle = organizationName?.trim() || 'Prado Systems';
  const amountStr = `$${amount}`;
  const footerYear = new Date().getFullYear();
  const normalizedHeaderColor = normalizeDocumentEmailHeaderColor(headerColor);
  const formattedEstimateNumber = formatDocumentNumber('estimate', estimate?.estimate_number);

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
          <p style={{ margin: '4px 0 0 0', fontSize: 13, opacity: 0.9 }}>New Estimate Prepared</p>
        </div>

        <div style={{ padding: '28px' }}>
          <h2 style={{ margin: '0 0 12px 0' }}>Hello {safeCustomerName},</h2>
          <p style={{ margin: '0 0 16px 0' }}>We have prepared a new estimate for your review:</p>

          <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '16px', margin: '20px 0' }}>
            {formattedEstimateNumber ? (
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Estimate Number:</strong> {formattedEstimateNumber}
              </p>
            ) : null}
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Estimate Title:</strong> {estimateTitle}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Total Estimated Cost:</strong>{' '}
              <span style={{ fontSize: 24, fontWeight: 700, color: normalizedHeaderColor }}>{amountStr}</span>
            </p>
          </div>

          <p style={{ margin: '0 0 12px 0' }}>
            If you approve this estimate, please let us know or reply to this email to schedule your service.
          </p>
          <p style={{ margin: 0 }}>
            Thank you for choosing <strong>{organizationName}</strong>!
          </p>

          {organizationSlogan ? (
            <p style={{ margin: '14px 0 0 0', fontSize: 12, color: '#64748b' }}>{organizationSlogan}</p>
          ) : null}

        </div>

        <div style={{ background: '#f8fafc', padding: '16px', textAlign: 'center', fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
          &copy; {footerYear} {organizationName}. All rights reserved.
        </div>
      </div>
    </div>
  );
}