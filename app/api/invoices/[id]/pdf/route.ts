import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@/lib/supabaseServer';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { getUserOrganization, verifyUserOrganizationAccess } from '@/lib/organization';
import { formatCurrency, normalizeCurrencyCode } from '@/lib/currency';
import { formatDocumentNumber, normalizeDocumentEmailHeaderColor } from '@/lib/documentBranding';
import { embedOrganizationLogo } from '@/lib/pdfLogo';

function hexToRgb(hex: string) {
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length !== 6) {
    return rgb(0, 0.6, 0.4);
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return rgb(r || 0, g || 0, b || 0);
}

function formatDate(value: string | null | undefined, locale = 'en-US') {
  if (!value) return 'N/A';
  const d = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

function truncateText(text: string, maxChars: number) {
  if (!text) return '';
  return text.length > maxChars ? `${text.slice(0, maxChars - 1)}...` : text;
}

async function fetchAndEmbedPhoto(pdfDoc: PDFDocument, url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length === 0) return null;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    if (isPng) {
      return await pdfDoc.embedPng(arrayBuffer);
    }
    return await pdfDoc.embedJpg(arrayBuffer);
  } catch (err) {
    console.warn(`[invoice PDF] Failed to embed photo: ${url}`, err);
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse('Missing Invoice ID', { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const lng = searchParams.get('lng') || 'en';
    const isEs = lng.startsWith('es');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { organization: defaultOrg } = await getUserOrganization(user.id);

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (
          id,
          first_name,
          last_name,
          company_name,
          email,
          phone,
          organization_id
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (invoiceError || !invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    const customer = invoice.customers as {
      id?: string;
      first_name?: string | null;
      last_name?: string | null;
      company_name?: string | null;
      email?: string | null;
      phone?: string | null;
      organization_id?: string | null;
    } | null;

    // Resolve the authoritative organization ID for this invoice
    const targetOrgId = customer?.organization_id || invoice.organization_id || defaultOrg?.id;

    if (!targetOrgId) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    let org = defaultOrg;

    // Verify organization ownership or active membership
    if (org?.id !== targetOrgId) {
      const access = await verifyUserOrganizationAccess(user.id, targetOrgId);
      if (!access.authorized) {
        return new NextResponse('Forbidden', { status: 403 });
      }
      org = access.organization || defaultOrg;
    }

    if (!org) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    // Auto-heal invoice record in background if organization_id is missing or out of sync with customer
    if (targetOrgId && invoice.organization_id !== targetOrgId) {
      const adminClient = createAdminClient();
      void adminClient
        .from('invoices')
        .update({ organization_id: targetOrgId })
        .eq('id', invoice.id);
    }

    // Get customer's primary property address
    let propertyAddress = '';
    if (customer?.id) {
      const { data: props } = await supabase
        .from('properties')
        .select('street_address')
        .eq('customer_id', customer.id)
        .limit(1);
      if (props && props.length > 0 && props[0].street_address) {
        propertyAddress = props[0].street_address;
      }
    }

    // Attempt to identify service/job description
    let serviceDescription = invoice.notes?.trim() || (isEs ? 'Servicio General Completado' : 'General Service Completed');
    if (!invoice.notes?.trim() && invoice.job_id) {
      const { data: linkedJob } = await supabase
        .from('jobs')
        .select('job_type')
        .eq('id', invoice.job_id)
        .maybeSingle();
      if (linkedJob?.job_type) {
        serviceDescription = linkedJob.job_type;
      }
    } else if (!invoice.notes?.trim() && customer?.id) {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('job_type, cost_amount, scheduled_date')
        .order('scheduled_date', { ascending: false })
        .limit(10);

      const targetBase = Number(invoice.total_amount || 0) - Number(invoice.tax_amount || 0);
      const matchedJob = (jobs || []).find(
        (j) => Math.abs(Number(j.cost_amount || 0) - targetBase) < 0.01
      ) || (jobs || [])[0];

      if (matchedJob?.job_type) {
        serviceDescription = matchedJob.job_type;
      }
    }

    // Prepare numerical values and branding
    const currency = normalizeCurrencyCode(invoice.currency_code || org.invoice_currency_code);
    const totalAmount = Number(invoice.total_amount || 0);
    const taxAmount = Number(invoice.tax_amount || 0);
    const baseAmount = Math.max(0, totalAmount - taxAmount);
    const taxRatePercent = org.invoice_tax_rate_percent ?? 8.25;

    const brandColorHex = normalizeDocumentEmailHeaderColor(org.document_email_header_color);
    const brandColorRgb = hexToRgb(brandColorHex);

    const formattedInvNumber =
      formatDocumentNumber('invoice', invoice.invoice_number) ||
      `INV-${invoice.id.slice(0, 6).toUpperCase()}`;

    const customerFullName =
      `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() ||
      customer?.company_name ||
      (isEs ? 'Cliente' : 'Valued Customer');

    const paymentTerms = org.default_payment_terms || (isEs ? 'Al Recibir' : 'Due on Receipt');
    const isPaid = (invoice.status || '').toLowerCase() === 'paid';

    // -------------------------------------------------------------
    // BUILD 8.5 x 11 INCH PDF (612 pt x 792 pt, Standard US Letter)
    // -------------------------------------------------------------
    const pdfDoc = await PDFDocument.create();
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Letter size: 8.5 x 11 inches = 612 x 792 points (72 pt / inch)
    const PAGE_WIDTH = 612;
    const PAGE_HEIGHT = 792;
    const MARGIN = 40;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 532 pt

    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // Top Accent Bar (Brand colored header band)
    const topBarHeight = 8;
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - topBarHeight,
      width: PAGE_WIDTH,
      height: topBarHeight,
      color: brandColorRgb,
    });

    let currentY = PAGE_HEIGHT - MARGIN;

    // Header Left: Organization Identity
    const embeddedLogo = await embedOrganizationLogo(pdfDoc, org.logo_url, 60, 48);
    const logoX = MARGIN;
    const textX = embeddedLogo ? MARGIN + embeddedLogo.width + 12 : MARGIN;

    if (embeddedLogo) {
      page.drawImage(embeddedLogo.image, {
        x: logoX,
        y: currentY - embeddedLogo.height,
        width: embeddedLogo.width,
        height: embeddedLogo.height,
      });
    }

    const orgName = org.name || 'Prado ERP';
    page.drawText(truncateText(orgName, embeddedLogo ? 26 : 34), {
      x: textX,
      y: currentY - 14,
      size: 20,
      font: boldFont,
      color: rgb(0.1, 0.12, 0.15),
    });

    let orgY = currentY - 30;
    if (org.slogan?.trim()) {
      page.drawText(truncateText(org.slogan.trim(), embeddedLogo ? 40 : 50), {
        x: textX,
        y: orgY,
        size: 9,
        font: regularFont,
        color: rgb(0.4, 0.45, 0.5),
      });
      orgY -= 14;
    }

    const orgAddressParts = [
      org.street_address,
      [org.city, org.state, org.zip_code].filter(Boolean).join(', '),
    ].filter(Boolean);

    if (orgAddressParts.length > 0) {
      page.drawText(truncateText(orgAddressParts.join(' • '), embeddedLogo ? 45 : 60), {
        x: textX,
        y: orgY,
        size: 8.5,
        font: regularFont,
        color: rgb(0.4, 0.45, 0.5),
      });
      orgY -= 12;
    }

    if (org.phone) {
      page.drawText(`Tel: ${org.phone}`, {
        x: textX,
        y: orgY,
        size: 8.5,
        font: regularFont,
        color: rgb(0.4, 0.45, 0.5),
      });
      orgY -= 12;
    }

    const logoBottomY = embeddedLogo ? currentY - embeddedLogo.height : currentY;

    // Header Right: Document Title & Number
    const invoiceTitle = isPaid
      ? (isEs ? 'RECIBO DE PAGO' : 'PAYMENT RECEIPT')
      : invoice.invoice_type === 'deposit'
      ? (isEs ? 'FACTURA DE ANTICIPO' : 'DEPOSIT INVOICE')
      : invoice.invoice_type === 'final'
      ? (isEs ? 'FACTURA DE SALDO' : 'BALANCE INVOICE')
      : (isEs ? 'FACTURA' : 'INVOICE');
    const invoiceTitleFontSize = invoiceTitle.length > 14 ? 17 : 22;
    const invoiceTitleWidth = boldFont.widthOfTextAtSize(invoiceTitle, invoiceTitleFontSize);
    page.drawText(invoiceTitle, {
      x: PAGE_WIDTH - MARGIN - invoiceTitleWidth,
      y: currentY - 16,
      size: invoiceTitleFontSize,
      font: boldFont,
      color: isPaid ? rgb(0.05, 0.55, 0.3) : brandColorRgb,
    });

    const invNumText = `# ${formattedInvNumber}`;
    const invNumWidth = boldFont.widthOfTextAtSize(invNumText, 11);
    page.drawText(invNumText, {
      x: PAGE_WIDTH - MARGIN - invNumWidth,
      y: currentY - 34,
      size: 11,
      font: boldFont,
      color: rgb(0.2, 0.25, 0.3),
    });

    // Status Badge Pill
    const badgeText = isPaid
      ? (isEs ? 'PAGADA • RECIBO OFICIAL' : 'PAID • OFFICIAL RECEIPT')
      : isEs
      ? 'PENDIENTE DE PAGO'
      : 'PAYMENT DUE';
    const badgeBgColor = isPaid ? rgb(0.86, 0.96, 0.9) : rgb(0.99, 0.93, 0.93);
    const badgeTextColor = isPaid ? rgb(0.05, 0.55, 0.3) : rgb(0.78, 0.15, 0.15);
    const badgeBorderColor = isPaid ? rgb(0.65, 0.9, 0.72) : rgb(0.95, 0.7, 0.7);

    const badgeWidth = regularFont.widthOfTextAtSize(badgeText, 8.5) + 16;
    const badgeHeight = 18;
    const badgeX = PAGE_WIDTH - MARGIN - badgeWidth;
    const badgeY = currentY - 58;

    page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: badgeWidth,
      height: badgeHeight,
      color: badgeBgColor,
      borderColor: badgeBorderColor,
      borderWidth: 1,
    });

    page.drawText(badgeText, {
      x: badgeX + 8,
      y: badgeY + 5,
      size: 8.5,
      font: boldFont,
      color: badgeTextColor,
    });

    // Divider Line
    currentY = Math.min(orgY, badgeY, logoBottomY) - 16;
    page.drawLine({
      start: { x: MARGIN, y: currentY },
      end: { x: PAGE_WIDTH - MARGIN, y: currentY },
      thickness: 1,
      color: rgb(0.88, 0.9, 0.93),
    });

    // -------------------------------------------------------------
    // BILL TO & INVOICE DETAILS SECTION (Two-column layout)
    // -------------------------------------------------------------
    currentY -= 20;
    const colWidth = CONTENT_WIDTH / 2 - 10;
    const col2X = MARGIN + colWidth + 20;

    // Col 1: INVOICE TO (Customer)
    page.drawText(isEs ? 'FACTURAR A' : 'INVOICE TO', {
      x: MARGIN,
      y: currentY,
      size: 8.5,
      font: boldFont,
      color: rgb(0.45, 0.5, 0.55),
    });

    let billToY = currentY - 14;
    page.drawText(truncateText(customerFullName, 38), {
      x: MARGIN,
      y: billToY,
      size: 11,
      font: boldFont,
      color: rgb(0.12, 0.15, 0.18),
    });
    billToY -= 14;

    if (customer?.company_name && customer.company_name !== customerFullName) {
      page.drawText(truncateText(customer.company_name, 40), {
        x: MARGIN,
        y: billToY,
        size: 9,
        font: regularFont,
        color: rgb(0.35, 0.4, 0.45),
      });
      billToY -= 12;
    }

    if (propertyAddress) {
      page.drawText(truncateText(propertyAddress, 42), {
        x: MARGIN,
        y: billToY,
        size: 8.5,
        font: regularFont,
        color: rgb(0.35, 0.4, 0.45),
      });
      billToY -= 12;
    }

    if (customer?.email) {
      page.drawText(truncateText(customer.email, 40), {
        x: MARGIN,
        y: billToY,
        size: 8.5,
        font: regularFont,
        color: rgb(0.35, 0.4, 0.45),
      });
      billToY -= 12;
    }

    if (customer?.phone) {
      page.drawText(truncateText(customer.phone, 30), {
        x: MARGIN,
        y: billToY,
        size: 8.5,
        font: regularFont,
        color: rgb(0.35, 0.4, 0.45),
      });
      billToY -= 12;
    }

    // Col 2: INVOICE DETAILS
    page.drawText(isEs ? 'DATOS DE LA FACTURA' : 'INVOICE DETAILS', {
      x: col2X,
      y: currentY,
      size: 8.5,
      font: boldFont,
      color: rgb(0.45, 0.5, 0.55),
    });

    let detailsY = currentY - 14;
    const drawDetailRow = (label: string, val: string) => {
      page.drawText(label, {
        x: col2X,
        y: detailsY,
        size: 8.5,
        font: regularFont,
        color: rgb(0.45, 0.5, 0.55),
      });
      const valWidth = boldFont.widthOfTextAtSize(val, 8.5);
      page.drawText(val, {
        x: PAGE_WIDTH - MARGIN - valWidth,
        y: detailsY,
        size: 8.5,
        font: boldFont,
        color: rgb(0.15, 0.18, 0.22),
      });
      detailsY -= 14;
    };

    drawDetailRow(isEs ? 'Fecha de Emisión:' : 'Invoice Date:', formatDate(invoice.created_at || invoice.due_date));
    drawDetailRow(isEs ? 'Fecha de Vencimiento:' : 'Due Date:', formatDate(invoice.due_date));
    drawDetailRow(isEs ? 'Condiciones de Pago:' : 'Payment Terms:', paymentTerms);
    drawDetailRow(isEs ? 'Moneda:' : 'Currency:', currency);
    if (isPaid && invoice.paid_at) {
      drawDetailRow(isEs ? 'Fecha de Pago:' : 'Paid On:', formatDate(invoice.paid_at));
    }

    // -------------------------------------------------------------
    // LINE ITEMS TABLE
    // -------------------------------------------------------------
    currentY = Math.min(billToY, detailsY) - 20;

    const tableHeaderHeight = 22;
    page.drawRectangle({
      x: MARGIN,
      y: currentY - tableHeaderHeight,
      width: CONTENT_WIDTH,
      height: tableHeaderHeight,
      color: rgb(0.95, 0.96, 0.98),
      borderColor: rgb(0.88, 0.9, 0.93),
      borderWidth: 1,
    });

    const colDescX = MARGIN + 12;
    const colQtyX = MARGIN + 310;
    const colRateX = MARGIN + 390;
    const colTotalX = PAGE_WIDTH - MARGIN - 12;

    page.drawText(isEs ? 'DESCRIPCIÓN' : 'DESCRIPTION', {
      x: colDescX,
      y: currentY - 15,
      size: 8.5,
      font: boldFont,
      color: rgb(0.3, 0.35, 0.4),
    });

    page.drawText(isEs ? 'CANT' : 'QTY', {
      x: colQtyX,
      y: currentY - 15,
      size: 8.5,
      font: boldFont,
      color: rgb(0.3, 0.35, 0.4),
    });

    const rateHeader = isEs ? 'TARIFA' : 'RATE';
    const rateHeaderWidth = boldFont.widthOfTextAtSize(rateHeader, 8.5);
    page.drawText(rateHeader, {
      x: colRateX + 35 - rateHeaderWidth,
      y: currentY - 15,
      size: 8.5,
      font: boldFont,
      color: rgb(0.3, 0.35, 0.4),
    });

    const amtHeader = isEs ? 'TOTAL' : 'AMOUNT';
    const amtHeaderWidth = boldFont.widthOfTextAtSize(amtHeader, 8.5);
    page.drawText(amtHeader, {
      x: colTotalX - amtHeaderWidth,
      y: currentY - 15,
      size: 8.5,
      font: boldFont,
      color: rgb(0.3, 0.35, 0.4),
    });

    currentY -= tableHeaderHeight;

    // Row 1: Primary Service Item
    const rowHeight = 36;
    page.drawRectangle({
      x: MARGIN,
      y: currentY - rowHeight,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.9, 0.92, 0.95),
      borderWidth: 1,
    });

    page.drawText(truncateText(serviceDescription, 50), {
      x: colDescX,
      y: currentY - 16,
      size: 9.5,
      font: boldFont,
      color: rgb(0.12, 0.15, 0.18),
    });

    const subText = isEs ? 'Servicio prestado según los términos' : 'Completed service as authorized';
    page.drawText(subText, {
      x: colDescX,
      y: currentY - 28,
      size: 7.5,
      font: regularFont,
      color: rgb(0.5, 0.55, 0.6),
    });

    page.drawText('1', {
      x: colQtyX + 5,
      y: currentY - 20,
      size: 9,
      font: regularFont,
      color: rgb(0.2, 0.25, 0.3),
    });

    const baseStr = formatCurrency(baseAmount, currency);
    const baseWidth = regularFont.widthOfTextAtSize(baseStr, 9);
    page.drawText(baseStr, {
      x: colRateX + 35 - baseWidth,
      y: currentY - 20,
      size: 9,
      font: regularFont,
      color: rgb(0.2, 0.25, 0.3),
    });

    const totalLineStr = formatCurrency(baseAmount, currency);
    const totalLineWidth = boldFont.widthOfTextAtSize(totalLineStr, 9);
    page.drawText(totalLineStr, {
      x: colTotalX - totalLineWidth,
      y: currentY - 20,
      size: 9,
      font: boldFont,
      color: rgb(0.1, 0.12, 0.15),
    });

    currentY -= rowHeight;

    // -------------------------------------------------------------
    // FINANCIAL SUMMARY & TOTALS SECTION
    // -------------------------------------------------------------
    currentY -= 16;
    const totalsBoxWidth = 240;
    const totalsBoxX = PAGE_WIDTH - MARGIN - totalsBoxWidth;

    const drawNormalLine = (label: string, value: string) => {
      const fontSize = 9;
      page.drawText(label, {
        x: totalsBoxX,
        y: currentY,
        size: fontSize,
        font: regularFont,
        color: rgb(0.35, 0.4, 0.45),
      });

      const valWidth = boldFont.widthOfTextAtSize(value, fontSize);
      page.drawText(value, {
        x: PAGE_WIDTH - MARGIN - 8 - valWidth,
        y: currentY,
        size: fontSize,
        font: boldFont,
        color: rgb(0.1, 0.12, 0.15),
      });

      currentY -= 16;
    };

    drawNormalLine(isEs ? 'Subtotal:' : 'Subtotal:', formatCurrency(baseAmount, currency));
    drawNormalLine(
      isEs
        ? `Impuesto / Tarifas (${taxRatePercent.toFixed(2)}%):`
        : `Sales Tax (${taxRatePercent.toFixed(2)}%):`,
      formatCurrency(taxAmount, currency)
    );

    // Grand Total Box (cleanly separated, no overlap)
    currentY -= 6;
    const grandTotalBoxHeight = 28;
    const grandTotalBoxY = currentY - grandTotalBoxHeight;

    page.drawRectangle({
      x: totalsBoxX - 8,
      y: grandTotalBoxY,
      width: totalsBoxWidth + 8,
      height: grandTotalBoxHeight,
      color: rgb(0.96, 0.98, 0.97),
      borderColor: brandColorRgb,
      borderWidth: 1,
    });

    const grandTotalLabel = isEs ? 'TOTAL A PAGAR:' : 'TOTAL DUE:';
    const grandTotalValue = formatCurrency(totalAmount, currency);
    const grandTotalTextY = grandTotalBoxY + 8;

    page.drawText(grandTotalLabel, {
      x: totalsBoxX,
      y: grandTotalTextY,
      size: 11,
      font: boldFont,
      color: brandColorRgb,
    });

    const grandTotalValWidth = boldFont.widthOfTextAtSize(grandTotalValue, 11);
    page.drawText(grandTotalValue, {
      x: PAGE_WIDTH - MARGIN - 8 - grandTotalValWidth,
      y: grandTotalTextY,
      size: 11,
      font: boldFont,
      color: brandColorRgb,
    });

    currentY = grandTotalBoxY - 14;

    if (isPaid) {
      drawNormalLine(isEs ? 'Monto Pagado:' : 'Amount Paid:', formatCurrency(totalAmount, currency));
      drawNormalLine(isEs ? 'Saldo Pendiente:' : 'Balance Due:', formatCurrency(0, currency));
    }

    // -------------------------------------------------------------
    // BOTTOM FOOTER & PAYMENT TERMS (Anchored near bottom)
    // -------------------------------------------------------------
    const footerY = 20;
    const disclaimerY = 31;
    const footerLineY = 43;

    const boxHeight = 56;
    const boxMarginBottom = 12;
    const boxY = footerLineY + boxMarginBottom;
    const boxTopY = boxY + boxHeight;

    page.drawRectangle({
      x: MARGIN,
      y: boxY,
      width: CONTENT_WIDTH,
      height: boxHeight,
      color: rgb(0.98, 0.99, 1),
      borderColor: rgb(0.88, 0.9, 0.94),
      borderWidth: 1,
    });

    page.drawText(isEs ? 'INFORMACIÓN Y TÉRMINOS DE PAGO' : 'PAYMENT TERMS & INSTRUCTIONS', {
      x: MARGIN + 12,
      y: boxTopY - 14,
      size: 8,
      font: boldFont,
      color: rgb(0.3, 0.35, 0.4),
    });

    const paymentNote = isPaid
      ? isEs
        ? 'Esta factura ha sido pagada en su totalidad. ¡Agradecemos su preferencia!'
        : 'This invoice has been paid in full. Thank you for your prompt payment!'
      : invoice.stripe_payment_url
      ? isEs
        ? `Pago seguro en línea disponible en: ${invoice.stripe_payment_url}`
        : `Pay online securely via: ${invoice.stripe_payment_url}`
      : isEs
        ? `Términos: ${paymentTerms}. Por favor emita el pago antes de la fecha de vencimiento indicada.`
        : `Terms: ${paymentTerms}. Please submit payment by the specified due date.`;

    page.drawText(truncateText(paymentNote, 85), {
      x: MARGIN + 12,
      y: boxTopY - 28,
      size: 8,
      font: regularFont,
      color: rgb(0.25, 0.3, 0.35),
    });

    page.drawText(isEs ? '¡Gracias por su negocio!' : 'Thank you for your business!', {
      x: MARGIN + 12,
      y: boxTopY - 44,
      size: 8.5,
      font: boldFont,
      color: brandColorRgb,
    });

    page.drawLine({
      start: { x: MARGIN, y: footerLineY },
      end: { x: PAGE_WIDTH - MARGIN, y: footerLineY },
      thickness: 0.5,
      color: rgb(0.88, 0.9, 0.93),
    });

    const legalDisclaimer = isEs
      ? 'Generado a través de Prado Systems. Prado Systems es un proveedor de software operativo y no es parte de esta transacción.'
      : 'Generated via Prado Systems. Prado Systems is an operational software provider and is not a party to this transaction.';
    page.drawText(legalDisclaimer, {
      x: MARGIN,
      y: disclaimerY,
      size: 6.8,
      font: regularFont,
      color: rgb(0.5, 0.55, 0.6),
    });

    const footerText = `${orgName}${org.phone ? ` • Tel: ${org.phone}` : ''}`;
    page.drawText(truncateText(footerText, 75), {
      x: MARGIN,
      y: footerY,
      size: 7,
      font: regularFont,
      color: rgb(0.55, 0.6, 0.65),
    });

    // Check for attached photos on invoice or linked job
    let rawPhotos: string[] = Array.isArray((invoice as any).photos) ? (invoice as any).photos : [];
    if (rawPhotos.length === 0 && invoice.job_id) {
      try {
        const { data: jobRow } = await supabase
          .from('jobs')
          .select('completion_photos')
          .eq('id', invoice.job_id)
          .maybeSingle();
        if (jobRow?.completion_photos && Array.isArray(jobRow.completion_photos)) {
          rawPhotos = jobRow.completion_photos;
        }
      } catch {
        // ignore
      }
    }

    // Try embedding up to 6 photos
    const embeddedPhotos: Array<{ image: any; width: number; height: number }> = [];
    if (rawPhotos.length > 0) {
      const photosToProcess = rawPhotos.slice(0, 6);
      for (const pUrl of photosToProcess) {
        if (!pUrl || typeof pUrl !== 'string') continue;
        const img = await fetchAndEmbedPhoto(pdfDoc, pUrl);
        if (img) {
          embeddedPhotos.push({
            image: img,
            width: img.width,
            height: img.height,
          });
        }
      }
    }

    const totalPages = embeddedPhotos.length > 0 ? 2 : 1;
    const pageCountText = isEs ? `Página 1 de ${totalPages}` : `Page 1 of ${totalPages}`;
    const pageCountWidth = regularFont.widthOfTextAtSize(pageCountText, 7);
    page.drawText(pageCountText, {
      x: PAGE_WIDTH - MARGIN - pageCountWidth,
      y: footerY,
      size: 7,
      font: regularFont,
      color: rgb(0.55, 0.6, 0.65),
    });

    // -------------------------------------------------------------
    // BUILD PAGE 2: FINISHED WORK PHOTOS (IF AVAILABLE)
    // -------------------------------------------------------------
    if (embeddedPhotos.length > 0) {
      const page2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

      // Top Accent Bar
      page2.drawRectangle({
        x: 0,
        y: PAGE_HEIGHT - topBarHeight,
        width: PAGE_WIDTH,
        height: topBarHeight,
        color: brandColorRgb,
      });

      let p2Y = PAGE_HEIGHT - MARGIN;

      // Header Left: Organization Logo & Identity
      if (embeddedLogo) {
        page2.drawImage(embeddedLogo.image, {
          x: logoX,
          y: p2Y - embeddedLogo.height,
          width: embeddedLogo.width,
          height: embeddedLogo.height,
        });
      }

      page2.drawText(truncateText(orgName, embeddedLogo ? 26 : 34), {
        x: textX,
        y: p2Y - 14,
        size: 18,
        font: boldFont,
        color: rgb(0.1, 0.12, 0.15),
      });

      page2.drawText(
        isEs
          ? 'Evidencia fotográfica de los servicios realizados'
          : 'Finished work photographic documentation',
        {
          x: textX,
          y: p2Y - 28,
          size: 8.5,
          font: regularFont,
          color: rgb(0.4, 0.45, 0.5),
        }
      );

      // Header Right: Title & Invoice reference
      const p2Title = isEs ? 'FOTOS DEL TRABAJO' : 'WORK PHOTOS & PROOF';
      const p2TitleWidth = boldFont.widthOfTextAtSize(p2Title, 14);
      page2.drawText(p2Title, {
        x: PAGE_WIDTH - MARGIN - p2TitleWidth,
        y: p2Y - 14,
        size: 14,
        font: boldFont,
        color: brandColorRgb,
      });

      const p2Ref = `# ${formattedInvNumber}`;
      const p2RefWidth = boldFont.widthOfTextAtSize(p2Ref, 10);
      page2.drawText(p2Ref, {
        x: PAGE_WIDTH - MARGIN - p2RefWidth,
        y: p2Y - 28,
        size: 10,
        font: boldFont,
        color: rgb(0.3, 0.35, 0.4),
      });

      // Divider below header
      const headerLineY = p2Y - 42;
      page2.drawLine({
        start: { x: MARGIN, y: headerLineY },
        end: { x: PAGE_WIDTH - MARGIN, y: headerLineY },
        thickness: 1,
        color: rgb(0.88, 0.9, 0.93),
      });

      // Photo Grid Layout
      const gridTopY = headerLineY - 16;
      const count = embeddedPhotos.length;

      if (count === 1) {
        // Single large centered photo
        const p = embeddedPhotos[0];
        const maxW = 440;
        const maxH = 460;
        const scale = Math.min(maxW / p.width, maxH / p.height);
        const w = p.width * scale;
        const h = p.height * scale;
        const x = MARGIN + (CONTENT_WIDTH - w) / 2;
        const y = gridTopY - h - 10;

        // Border box
        page2.drawRectangle({
          x: x - 4,
          y: y - 4,
          width: w + 8,
          height: h + 8,
          color: rgb(0.96, 0.97, 0.98),
          borderColor: rgb(0.85, 0.88, 0.92),
          borderWidth: 1,
        });

        page2.drawImage(p.image, { x, y, width: w, height: h });

        const capText = isEs ? 'Foto 1 - Trabajo completado' : 'Photo 1 - Finished service';
        const capW = regularFont.widthOfTextAtSize(capText, 9);
        page2.drawText(capText, {
          x: MARGIN + (CONTENT_WIDTH - capW) / 2,
          y: y - 20,
          size: 9,
          font: regularFont,
          color: rgb(0.4, 0.45, 0.5),
        });
      } else {
        // 2-column grid
        const colGap = 16;
        const rowGap = 20;
        const colWidth = (CONTENT_WIDTH - colGap) / 2; // ~258 pt
        const boxHeight = count <= 2 ? 280 : count <= 4 ? 220 : 170;

        for (let i = 0; i < count; i++) {
          const p = embeddedPhotos[i];
          const colIndex = i % 2;
          const rowIndex = Math.floor(i / 2);

          const cellX = MARGIN + colIndex * (colWidth + colGap);
          const cellY = gridTopY - (rowIndex + 1) * boxHeight - rowIndex * rowGap;

          // Draw background card for photo
          page2.drawRectangle({
            x: cellX,
            y: cellY,
            width: colWidth,
            height: boxHeight,
            color: rgb(0.97, 0.98, 0.99),
            borderColor: rgb(0.88, 0.9, 0.93),
            borderWidth: 1,
          });

          // Scale image inside box with padding
          const pad = 6;
          const labelReserve = 18;
          const availW = colWidth - pad * 2;
          const availH = boxHeight - pad * 2 - labelReserve;
          const scale = Math.min(availW / p.width, availH / p.height);
          const w = p.width * scale;
          const h = p.height * scale;
          const imgX = cellX + pad + (availW - w) / 2;
          const imgY = cellY + pad + labelReserve + (availH - h) / 2;

          page2.drawImage(p.image, { x: imgX, y: imgY, width: w, height: h });

          // Caption label inside card at bottom
          const cap = isEs ? `Foto ${i + 1}` : `Photo ${i + 1}`;
          page2.drawText(cap, {
            x: cellX + pad + 4,
            y: cellY + pad + 3,
            size: 8,
            font: boldFont,
            color: rgb(0.4, 0.45, 0.5),
          });
        }
      }

      // Page 2 Footer
      const p2FooterLineY = MARGIN + 22;
      const p2FooterY = MARGIN + 8;
      const p2DisclaimerY = MARGIN + 14;

      page2.drawLine({
        start: { x: MARGIN, y: p2FooterLineY },
        end: { x: PAGE_WIDTH - MARGIN, y: p2FooterLineY },
        thickness: 0.5,
        color: rgb(0.88, 0.9, 0.93),
      });

      page2.drawText(legalDisclaimer, {
        x: MARGIN,
        y: p2DisclaimerY,
        size: 6.8,
        font: regularFont,
        color: rgb(0.5, 0.55, 0.6),
      });

      page2.drawText(truncateText(footerText, 75), {
        x: MARGIN,
        y: p2FooterY,
        size: 7,
        font: regularFont,
        color: rgb(0.55, 0.6, 0.65),
      });

      const p2CountText = isEs ? `Página 2 de ${totalPages}` : `Page 2 of ${totalPages}`;
      const p2CountWidth = regularFont.widthOfTextAtSize(p2CountText, 7);
      page2.drawText(p2CountText, {
        x: PAGE_WIDTH - MARGIN - p2CountWidth,
        y: p2FooterY,
        size: 7,
        font: regularFont,
        color: rgb(0.55, 0.6, 0.65),
      });
    }

    // Save and send response
    const pdfBytes = await pdfDoc.save();
    const pdfSafeBytes = Uint8Array.from(pdfBytes);
    const pdfBlob = new Blob([pdfSafeBytes], { type: 'application/pdf' });
    const filename = `Invoice-${formattedInvNumber}.pdf`;

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Invoice PDF generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate invoice PDF.';
    return new NextResponse(message, { status: 500 });
  }
}
