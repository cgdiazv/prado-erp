import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@/lib/supabaseServer';
import { getUserOrganization } from '@/lib/organization';
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

    const { organization: org } = await getUserOrganization(user.id);
    if (!org) {
      return new NextResponse('Organization not found', { status: 404 });
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        due_date,
        tax_amount,
        total_amount,
        currency_code,
        status,
        stripe_payment_url,
        paid_at,
        created_at,
        customer_id,
        organization_id,
        customers (
          id,
          first_name,
          last_name,
          company_name,
          email,
          phone
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (invoiceError || !invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    // Verify organization ownership
    if (invoice.organization_id && invoice.organization_id !== org.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const customer = invoice.customers as {
      id?: string;
      first_name?: string | null;
      last_name?: string | null;
      company_name?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;

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
    let serviceDescription = isEs ? 'Servicio General Completado' : 'General Service Completed';
    if (customer?.id) {
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
    if (org.slogan) {
      page.drawText(truncateText(org.slogan, embeddedLogo ? 40 : 50), {
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

    // Header Right: "INVOICE" Document Title & Number
    const invoiceTitle = isEs ? 'FACTURA' : 'INVOICE';
    const invoiceTitleWidth = boldFont.widthOfTextAtSize(invoiceTitle, 24);
    page.drawText(invoiceTitle, {
      x: PAGE_WIDTH - MARGIN - invoiceTitleWidth,
      y: currentY - 16,
      size: 24,
      font: boldFont,
      color: brandColorRgb,
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
      ? isEs
        ? 'PAGADA'
        : 'PAID'
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
    const footerY = 32;
    const footerLineY = footerY + 14;

    const boxHeight = 56;
    const boxMarginBottom = 14;
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

    const footerText = `${orgName} • ${org.phone ? `Tel: ${org.phone} • ` : ''}Generated by Prado ERP`;
    page.drawText(truncateText(footerText, 75), {
      x: MARGIN,
      y: footerY,
      size: 7.5,
      font: regularFont,
      color: rgb(0.55, 0.6, 0.65),
    });

    const pageCountText = isEs ? 'Página 1 de 1' : 'Page 1 of 1';
    const pageCountWidth = regularFont.widthOfTextAtSize(pageCountText, 7.5);
    page.drawText(pageCountText, {
      x: PAGE_WIDTH - MARGIN - pageCountWidth,
      y: footerY,
      size: 7.5,
      font: regularFont,
      color: rgb(0.55, 0.6, 0.65),
    });

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
