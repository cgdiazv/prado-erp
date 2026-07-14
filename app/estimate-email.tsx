import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';

interface Estimate {
  id: string;
  title: string;
  description: string | null;
  estimated_amount: number;
}

interface EstimateEmailProps {
  customerName: string;
  estimate: Estimate;
}

export const EstimateEmail = ({ customerName, estimate }: EstimateEmailProps) => {
  const previewText = `Tu propuesta para "${estimate.title}" está lista para revisión.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header con el Logo de Prado */}
          <Section style={headerSection}>
            <span style={logoBadge}>P</span>
            <span style={logoText}>Prado</span>
          </Section>

          {/* Cuerpo del Correo */}
          <Section style={contentSection}>
            <Heading style={heading}>Hola {customerName},</Heading>
            
            <Text style={paragraph}>
              Gracias por tu confianza e interés en trabajar con nosotros. Hemos generado una propuesta detallada para tu próximo servicio:
            </Text>

            {/* Caja de Datos de la Cotización */}
            <Section style={estimateBox}>
              <Text style={estimateTitleLabel}>SERVICIO / PROPUESTA</Text>
              <Text style={estimateTitleValue}>{estimate.title}</Text>
              
              {estimate.description && (
                <Text style={estimateDescription}>{estimate.description}</Text>
              )}

              <Hr style={boxDivider} />

              <Text style={priceLabel}>IMPORTE TOTAL ESTIMADO</Text>
              <Text style={priceValue}>${estimate.estimated_amount.toFixed(2)} USD</Text>
            </Section>

            <Text style={paragraph}>
              Puedes revisar el alcance completo, los términos del servicio y aprobar la propuesta formalmente haciendo clic en el siguiente botón:
            </Text>

            {/* Botón de Acción Principal (Estilo Supabase/Prado) */}
            <Section style={buttonContainer}>
              <Link
                href={`${process.env.NEXT_PUBLIC_BASE_URL}/estimates/${estimate.id}`}
                style={button}
              >
                Revisar y Aprobar Propuesta
              </Link>
            </Section>

            <Text style={footerWarning}>
              * Nota: Esta cotización es válida por 30 días a partir de la fecha de envío. Si tienes alguna pregunta sobre el alcance, responde directamente a este correo.
            </Text>
          </Section>

          <Hr style={footerDivider} />

          {/* Pie de Página */}
          <Section style={footerSection}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} Prado Systems. Todo el software operativo de campo en un solo lugar.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default EstimateEmail;

/* ==========================================
   ESTILOS CLEAN WHITE (SUPABASE VIBES)
   ========================================== */

const main = {
  backgroundColor: '#ffffff', // Fondo exterior blanco puro
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  padding: '40px 10px',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '560px',
  padding: '16px 8px',
};

// Logo & Header
const headerSection = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '32px',
};

const logoBadge = {
  display: 'inline-block',
  width: '26px',
  height: '26px',
  lineHeight: '26px',
  borderRadius: '6px',
  background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', // emerald-500 a teal-500
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: '900',
  textAlign: 'center' as const,
  marginRight: '8px',
};

const logoText = {
  color: '#0f172a', // slate-900
  fontSize: '18px',
  fontWeight: '700',
  letterSpacing: '-0.025em',
};

// Contenido
const contentSection = {
  padding: '0',
};

const heading = {
  color: '#0f172a', // slate-900
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 16px 0',
  letterSpacing: '-0.01em',
};

const paragraph = {
  color: '#334155', // slate-700 para máxima legibilidad
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 20px 0',
  textAlign: 'left' as const,
};

// Tarjeta del Presupuesto (Mismo estilo minimalista de Supabase)
const estimateBox = {
  backgroundColor: '#f8fafc', // slate-50 (gris ultra claro)
  border: '1px solid #e2e8f0', // slate-200
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '24px',
};

const estimateTitleLabel = {
  color: '#64748b', // slate-500
  fontSize: '10px',
  fontWeight: '700',
  letterSpacing: '0.05em',
  margin: '0 0 4px 0',
};

const estimateTitleValue = {
  color: '#0f172a', // slate-900
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 6px 0',
};

const estimateDescription = {
  color: '#475569', // slate-600
  fontSize: '13px',
  lineHeight: '18px',
  margin: '0',
};

const boxDivider = {
  borderColor: '#e2e8f0', // slate-200
  margin: '16px 0',
};

const priceLabel = {
  color: '#059669', // emerald-600
  fontSize: '10px',
  fontWeight: '700',
  letterSpacing: '0.05em',
  margin: '0 0 2px 0',
};

const priceValue = {
  color: '#0f172a',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
};

// Botón Sólido Emerald (Igual al de confirmación de Supabase)
const buttonContainer = {
  textAlign: 'left' as const, // Alineado a la izquierda para un look más orgánico
  margin: '28px 0',
};

const button = {
  backgroundColor: '#10b981', // emerald-500 nativo de Prado
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '11px 20px',
};

const footerWarning = {
  color: '#64748b', // slate-500
  fontSize: '11px',
  lineHeight: '16px',
  margin: '20px 0 0 0',
};

// Footer
const footerDivider = {
  borderColor: '#f1f5f9', // slate-100
  margin: '32px 0 16px 0',
};

const footerSection = {
  textAlign: 'left' as const,
};

const footerText = {
  color: '#94a3b8', // slate-400
  fontSize: '11px',
  margin: '0',
};