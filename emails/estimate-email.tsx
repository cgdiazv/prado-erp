import * as React from 'react';

type EstimateLike = {
  title?: string;
  estimated_amount?: number;
  description?: string | null;
  created_at?: string;
};

type EstimateEmailProps = {
  customerName: string;
  estimate: EstimateLike;
};

export default function EstimateEmail({ customerName, estimate }: EstimateEmailProps) {
  const amount = Number(estimate?.estimated_amount || 0).toFixed(2);
  const createdAt = estimate?.created_at ? new Date(estimate.created_at).toLocaleDateString() : 'N/A';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 600, margin: '0 auto', color: '#0f172a' }}>
      <h2 style={{ marginBottom: 8 }}>Your Prado Estimate</h2>
      <p style={{ marginTop: 0, color: '#475569' }}>Hi {customerName},</p>
      <p style={{ color: '#475569' }}>
        We prepared an estimate for your review. Details are below.
      </p>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, background: '#f8fafc' }}>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Title:</strong> {estimate?.title || 'Estimate'}
        </p>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Estimated Amount:</strong> ${amount}
        </p>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Created:</strong> {createdAt}
        </p>
        {estimate?.description ? (
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            <strong>Description:</strong> {estimate.description}
          </p>
        ) : null}
      </div>

      <p style={{ marginTop: 16, color: '#475569', fontSize: 13 }}>
        Please reply to this email if you have any questions.
      </p>
    </div>
  );
}
