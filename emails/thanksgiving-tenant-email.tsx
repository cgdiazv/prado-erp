import * as React from 'react';

export type ThanksgivingTenantEmailProps = {
  recipientName?: string;
  organizationName?: string;
  dashboardUrl?: string;
};

export default function ThanksgivingTenantEmail({
  recipientName = 'Valued Partner',
  organizationName,
  dashboardUrl = 'https://pradojob.com/en/dashboard',
}: ThanksgivingTenantEmailProps) {
  const safeName = recipientName?.trim() || 'Valued Partner';
  const safeOrg = organizationName?.trim() || '';
  const footerYear = new Date().getFullYear();

  return (
    <div
      style={{
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        backgroundColor: '#fdf8f3',
        margin: 0,
        padding: '24px 16px',
        color: '#292524',
      }}
    >
      <div
        style={{
          maxWidth: 600,
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #fed7aa',
          overflow: 'hidden',
          boxShadow: '0 4px 12px -2px rgba(154, 52, 18, 0.08)',
        }}
      >
        {/* Warm Festive Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #d97706 0%, #c2410c 55%, #7c2d12 100%)',
            padding: '32px 24px',
            textAlign: 'center',
            color: '#ffffff',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              background: 'rgba(255, 255, 255, 0.16)',
              color: '#ffffff',
              fontWeight: 700,
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: 11,
              marginBottom: 14,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            🍂 Season of Gratitude
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              lineHeight: 1.25,
            }}
          >
            🦃 Happy Thanksgiving!
          </h1>
          <p
            style={{
              margin: '8px 0 0 0',
              fontSize: 14,
              opacity: 0.92,
            }}
          >
            Warm wishes from all of us at Prado
          </p>
        </div>

        {/* Body Content */}
        <div style={{ padding: '32px 28px' }}>
          <h2
            style={{
              margin: '0 0 16px 0',
              fontSize: 19,
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            Hello {safeName},
          </h2>

          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: 15,
              lineHeight: '1.65',
              color: '#334155',
            }}
          >
            As we gather with family and friends this Thanksgiving, we wanted to pause and say a heartfelt{' '}
            <strong>thank you</strong> for being part of the Prado community
            {safeOrg ? (
              <>
                {' '}
                and for trusting us to help power <strong>{safeOrg}</strong>
              </>
            ) : null}
            .
          </p>

          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: 15,
              lineHeight: '1.65',
              color: '#334155',
            }}
          >
            We know how much dedication, early mornings, and hard work go into serving your customers every single day. It is a privilege to build tools that help your business quote, schedule jobs, and get paid with less friction.
          </p>

          {/* Highlight Box */}
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 10,
              padding: '20px 22px',
              margin: '24px 0',
            }}
          >
            <h3
              style={{
                margin: '0 0 8px 0',
                fontSize: 13,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#b45309',
              }}
            >
              Our Thanksgiving Wish for You
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: '1.6',
                color: '#78350f',
              }}
            >
              May your holiday be filled with warmth, great food, and well-deserved rest with the people who matter most. Here is to a joyful holiday season and continued growth in the year ahead!
            </p>
          </div>

          <p
            style={{
              margin: '0 0 24px 0',
              fontSize: 14,
              lineHeight: '1.6',
              color: '#475569',
            }}
          >
            As always, your Prado workspace is running around the clock whenever you need it, and our team is always just a reply away if there is ever anything we can do to support your business.
          </p>

          <div style={{ textAlign: 'center', margin: '28px 0' }}>
            <a
              href={dashboardUrl}
              style={{
                display: 'inline-block',
                padding: '12px 28px',
                backgroundColor: '#c2410c',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.01em',
              }}
            >
              Go to Your Prado Dashboard
            </a>
          </div>

          <p
            style={{
              margin: '24px 0 0 0',
              fontSize: 14,
              lineHeight: '1.5',
              color: '#78716c',
            }}
          >
            With gratitude,
            <br />
            <strong style={{ color: '#431407' }}>The Prado Team</strong>
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            background: '#fff7ed',
            padding: '18px 24px',
            textAlign: 'center',
            fontSize: 12,
            color: '#9a3412',
            borderTop: '1px solid #ffedd5',
          }}
        >
          &copy; {footerYear} Prado Systems. All rights reserved.
        </div>
      </div>
    </div>
  );
}
