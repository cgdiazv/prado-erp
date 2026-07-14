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
  organizationSlogan?: string;
  organizationName?: string;
  organizationLogoUrl?: string;
};

export default function EstimateEmail({
  customerName,
  estimate,
  organizationSlogan = 'Field Service Software',
  organizationName = 'Prado Systems',
  organizationLogoUrl = '',
}: EstimateEmailProps) {
  const amount = Number(estimate?.estimated_amount || 0).toFixed(2);
  const createdAt = estimate?.created_at ? new Date(estimate.created_at).toLocaleDateString() : 'N/A';
  const fallbackInitial = organizationName.trim().charAt(0).toUpperCase() || 'P';

  // Lógica optimizada y tolerante para parsear las líneas del desglose
  const parseDescriptionItems = (desc: string | null | undefined) => {
    if (!desc) return [];

    // Separamos por salto de línea sin importar el entorno operativos (\n o \r\n)
    const lines = desc.split(/\r?\n/);
    const items: { name: string; cost: string }[] = [];

    lines.forEach(line => {
      // REGEX CORREGIDA: Tolera espacios invisibles al final y captura importes limpios
      const match = line.match(/^\s*-\s*(.*?):\s*\$(.*?)\s*$/);
      if (match) {
        items.push({
          name: match[1].trim(),
          cost: Number(match[2].replace(/,/g, '')).toFixed(2)
        });
      }
    });
    return items;
  };

  const parsedItems = parseDescriptionItems(estimate?.description);
  const hasParsedItems = parsedItems.length > 0;

  return (
    <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', maxWidth: 600, margin: '20px auto', color: '#0f172a', padding: '10px' }}>
      
      {/* CONTENEDOR TIPO HOJA DE DOCUMENTO */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '32px', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        
        {/* ENCABEZADO PRINCIPAL */}
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
                {/* TÍTULO CAMBIADO A SOLO "ESTIMATE" */}
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 750, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimate</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>Date: {createdAt}</p>
              </td>
            </tr>
          </tbody>
        </table>

        {/* INFORMACIÓN DE DESTINATARIO */}
        <div style={{ marginBottom: 32, background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8, padding: 16 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Prepared For:</span>
          <strong style={{ fontSize: 15, color: '#0f172a', display: 'block' }}>{customerName}</strong>
          <span style={{ fontSize: 12, color: '#475569', display: 'block', marginTop: 2 }}>{estimate?.title || 'General Service'}</span>
        </div>

        {/* DETALLE / TABLA DE ARTÍCULOS */}
        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>Service Breakdown</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', textTransform: 'uppercase', fontSize: 11, color: '#64748b', fontWeight: 700 }}>
              <th style={{ textAlign: 'left', padding: '8px 0' }}>Description</th>
              <th style={{ textAlign: 'right', padding: '8px 0' }}>Total</th>
            </tr>
          </thead>
          <tbody style={{ color: '#334155' }}>
            {hasParsedItems ? (
              parsedItems.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 0', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600 }}>${item.cost}</td>
                </tr>
              ))
            ) : (
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 0', fontWeight: 500, whiteSpace: 'pre-wrap' }}>
                  {estimate?.description || estimate?.title || 'Operational field services.'}
                </td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 600, verticalAlign: 'top' }}>${amount}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* SECCIÓN DE TOTALES */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid #0f172a', paddingTop: 16, marginBottom: 16 }}>
          <table style={{ width: '240px', fontSize: 13 }}>
            <tbody>
              <tr>
                <td style={{ color: '#059669', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', verticalAlign: 'middle' }}>Total Amount</td>
                <td style={{ textAlign: 'right', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>${amount}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* NOTAS AL PIE DEL DOCUMENTO */}
        <div style={{ marginTop: 40, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#64748b', lineHeight: '16px' }}>
            <strong>Estimate Terms:</strong> This proposal is valid for 30 operational days. To proceed with scheduling the field crew or to make adjustments to the scope of work, please reply directly to this notification.
          </p>
        </div>
      </div>

      {/* FOOTER DEL CORREO EXTERNO */}
      <p style={{ marginTop: 20, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>
        This is an official document generated automatically by Prado Hub.
      </p>
    </div>
  );
}