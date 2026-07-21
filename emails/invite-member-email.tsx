import * as React from 'react';

type InviteMemberEmailProps = {
  inviteeEmail: string;
  inviterName: string;
  organizationName?: string;
  organizationSlogan?: string;
  organizationLogoUrl?: string;
  role: 'member' | 'admin' | 'accountant' | 'viewer';
  inviteLink?: string;
};

const roleLabels: Record<string, { label: string; description: string }> = {
  member: {
    label: 'Supervisor',
    description: 'Can edit and create work orders, estimates, and customer data.'
  },
  admin: {
    label: 'Manager',
    description: 'Can manage team members, settings, and view all data.'
  },
  accountant: {
    label: 'Accountant',
    description: 'Can view data and manage billing and financial records.'
  },
  viewer: {
    label: 'Guest',
    description: 'Read-only access to dashboards and reports.'
  }
};

export default function InviteMemberEmail({
  inviteeEmail,
  inviterName,
  organizationName = 'Prado Systems',
  organizationSlogan = 'Field Service Software',
  organizationLogoUrl = '',
  role = 'member',
  inviteLink = '#'
}: InviteMemberEmailProps) {
  const fallbackInitial = organizationName.trim().charAt(0).toUpperCase() || 'P';
  const roleInfo = roleLabels[role] || roleLabels.member;
  const ctaText = 'Set Password and Accept Invitation';

  return (
    <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', maxWidth: 600, margin: '20px auto', color: '#0f172a', padding: '10px' }}>
      
      {/* CONTENEDOR TIPO HOJA DE DOCUMENTO */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '32px', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        {/* ENCABEZADO PRINCIPAL */}
        <table style={{ width: '100%', marginBottom: 32 }}>
          <tbody>
            <tr>
              <td colSpan={2} style={{ verticalAlign: 'top', paddingBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: 'right', verticalAlign: 'top' }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 750, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team Invite</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>Date: {new Date().toLocaleDateString()}</p>
              </td>
            </tr>
          </tbody>
        </table>

        {/* INFORMACIÓN DE INVITACIÓN */}
        <div style={{ marginBottom: 32, background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8, padding: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Invitation for:</span>
          <strong style={{ fontSize: 15, color: '#0f172a', display: 'block' }}>{inviteeEmail}</strong>
          <span style={{ fontSize: 12, color: '#475569', display: 'block', marginTop: 2 }}>You have been invited by <strong>{inviterName}</strong></span>
        </div>

        {/* ROL Y DESCRIPCIÓN */}
        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>Your Role</h3>
        
        <div style={{ marginBottom: 32, padding: 16, background: '#fafbfc', borderLeft: '4px solid #10b981', borderRadius: 4 }}>
          <h4 style={{ margin: '0 0 6px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{roleInfo.label}</h4>
          <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: '18px' }}>{roleInfo.description}</p>
        </div>

        {/* CTA BUTTON */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <a
            href={inviteLink}
            style={{
              display: 'inline-block',
              padding: '12px 32px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              textDecoration: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.025em',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
            }}
          >
            {ctaText}
          </a>
        </div>

        {/* INFORMACIÓN ADICIONAL */}
        <div style={{ marginTop: 32, borderTop: '1px solid #e2e8f0', paddingTop: 16, background: '#f9fafb', borderRadius: 8, padding: 16 }}>
          <p style={{ margin: '0 0 12px 0', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Steps:</p>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#475569', lineHeight: '20px' }}>
            <li style={{ marginBottom: 6 }}>Click the button above to continue</li>
            <li style={{ marginBottom: 6 }}>Set your password to verify your invitation</li>
            <li>You will immediately have access to {organizationName}</li>
          </ol>
        </div>

        {/* NOTAS AL PIE DEL DOCUMENTO */}
        <div style={{ marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: '16px' }}>
            <strong>Questions?</strong> If you have any questions about this invitation, please contact your team administrator or reply to this email.
          </p>
        </div>
      </div>

      {/* FOOTER DEL CORREO EXTERNO */}
      <p style={{ marginTop: 20, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>
        This is an official team invitation from {organizationName}.
      </p>
    </div>
  );
}
