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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse('Missing Quote ID', { status: 400 });
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

    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select(`
        id,
        estimate_number,
        title,
        description,
        estimated_amount,
        payment_terms,
        status,
        created_at,
        customer_id,
        property_id,
        organization_id,
        customers (
          id,
          first_name,
          last_name,
          company_name,
          email,
          phone,
          organization_id
        ),
        properties (
          id,
          street_address,
          city
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (estimateError || !estimate) {
      return new NextResponse('Quote not found', { status: 404 });
    }

    const customer = estimate.customers as {
      id?: string;
      first_name?: string | null;
      last_name?: string | null;
      company_name?: string | null;
      email?: string | null;
      phone?: string | null;
      organization_id?: string | null;
    } | null;

    // Resolve the authoritative organization ID for this quote
    const targetOrgId = customer?.organization_id || estimate.organization_id || defaultOrg?.id;

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

    // Auto-heal quote record in background if organization_id is missing or out of sync with customer
    if (targetOrgId && estimate.organization_id !== targetOrgId) {
      const adminClient = createAdminClient();
      void adminClient
        .from('estimates')
        .update({ organization_id: targetOrgId })
        .eq('id', estimate.id);
    }

    const property = estimate.properties as {
      id?: string;
      street_address?: string | null;
      city?: string | null;
    } | null;

    // Get customer's property address
    let propertyAddress = '';
    if (property?.street_address) {
      propertyAddress = [property.street_address, property.city].filter(Boolean).join(', ');
    } else if (customer?.id) {
      const { data: props } = await supabase
        .from('properties')
        .select('street_address, city')
        .eq('customer_id', customer.id)
        .limit(1);
      if (props && props.length > 0 && props[0].street_address) {
        propertyAddress = [props[0].street_address, props[0].city].filter(Boolean).join(', ');
      }
    }

    // Parse line items and notes from estimate.description
    const rawDescription = (estimate.description || '').trim();
    const breakdownLabels = [
      isEs ? 'Detalle de servicios:' : 'Service breakdown:',
      'Service breakdown:',
      'Detalle de servicios:',
    ];
    const breakdownLabel = breakdownLabels.find((label) => rawDescription.includes(label));

    let notes = rawDescription;
    let breakdownText = '';

    if (breakdownLabel) {
      const parts = rawDescription.split(breakdownLabel);
      notes = (parts[0] || '').trim();
      breakdownText = (parts.slice(1).join(breakdownLabel) || '').trim();
    }

    type LineItem = { name: string; price: number };
    let lineItems: LineItem[] = [];

    if (breakdownText) {
      lineItems = breakdownText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith('- '))
        .map((line) => {
          const cleaned = line.replace(/^-\s*/, '');
          const match = cleaned.match(/^(.*):\s*\$?([0-9]+(?:\.[0-9]+)?)$/);
          const serviceName = (match?.[1] || '').trim();
          const servicePrice = Number.parseFloat(match?.[2] || '0');
          return {
            name: serviceName,
            price: Number.isFinite(servicePrice) ? servicePrice : 0,
          };
        })
        .filter((line) => line.name && line.price > 0);
    }

    if (lineItems.length === 0) {
      lineItems = [
        {
          name: estimate.title || (isEs ? 'Servicio General' : 'General Service'),
          price: Number(estimate.estimated_amount || 0),
        },
      ];
    }

    // Numerical values and branding
    const currency = normalizeCurrencyCode(org.invoice_currency_code);
    const totalAmount = Number(estimate.estimated_amount || 0);

    const brandColorHex = normalizeDocumentEmailHeaderColor(org.document_email_header_color);
    const brandColorRgb = hexToRgb(brandColorHex);

    const formattedEstNumber =
      formatDocumentNumber('estimate', estimate.estimate_number) ||
      `EST-${estimate.id.slice(0, 6).toUpperCase()}`;

    const customerFullName =
      `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() ||
      customer?.company_name ||
      (isEs ? 'Cliente' : 'Valued Customer');

    const paymentTerms =
      estimate.payment_terms || org.default_payment_terms || (isEs ? 'Al Recibir' : 'Due on Receipt');

    const statusStr = (estimate.status || 'draft').toLowerCase();

    // -------------------------------------------------------------
    // BUILD 8.5 x 11 INCH PDF (612 pt x 792 pt, Standard US Letter)
    // -------------------------------------------------------------
    const pdfDoc = await PDFDocument.create();
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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

    // Header Right: "QUOTE" Document Title & Number
    const quoteTitle = isEs ? 'COTIZACIÓN' : 'QUOTE';
    const quoteTitleWidth = boldFont.widthOfTextAtSize(quoteTitle, 24);
    page.drawText(quoteTitle, {
      x: PAGE_WIDTH - MARGIN - quoteTitleWidth,
      y: currentY - 16,
      size: 24,
      font: boldFont,
      color: brandColorRgb,
    });

    const estNumText = `# ${formattedEstNumber}`;
    const estNumWidth = boldFont.widthOfTextAtSize(estNumText, 11);
    page.drawText(estNumText, {
      x: PAGE_WIDTH - MARGIN - estNumWidth,
      y: currentY - 34,
      size: 11,
      font: boldFont,
      color: rgb(0.2, 0.25, 0.3),
    });

    // Status Badge Pill
    let badgeText = isEs ? 'BORRADOR' : 'DRAFT';
    let badgeBgColor = rgb(0.94, 0.95, 0.97);
    let badgeTextColor = rgb(0.35, 0.4, 0.45);
    let badgeBorderColor = rgb(0.85, 0.88, 0.92);

    if (statusStr === 'approved') {
      badgeText = isEs ? 'APROBADA' : 'APPROVED';
      badgeBgColor = rgb(0.86, 0.96, 0.9);
      badgeTextColor = rgb(0.05, 0.55, 0.3);
      badgeBorderColor = rgb(0.65, 0.9, 0.72);
    } else if (statusStr === 'sent') {
      badgeText = isEs ? 'ENVIADA' : 'SENT';
      badgeBgColor = rgb(0.99, 0.95, 0.88);
      badgeTextColor = rgb(0.8, 0.5, 0.1);
      badgeBorderColor = rgb(0.95, 0.85, 0.7);
    } else if (statusStr === 'declined') {
      badgeText = isEs ? 'RECHAZADA' : 'DECLINED';
      badgeBgColor = rgb(0.99, 0.93, 0.93);
      badgeTextColor = rgb(0.78, 0.15, 0.15);
      badgeBorderColor = rgb(0.95, 0.7, 0.7);
    }

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
    // QUOTE FOR & QUOTE DETAILS SECTION (Two-column layout)
    // -------------------------------------------------------------
    currentY -= 20;
    const colWidth = CONTENT_WIDTH / 2 - 10;
    const col2X = MARGIN + colWidth + 20;

    // Col 1: QUOTE FOR (Customer)
    page.drawText(isEs ? 'COTIZAR A' : 'QUOTE FOR', {
      x: MARGIN,
      y: currentY,
      size: 8.5,
      font: boldFont,
      color: rgb(0.45, 0.5, 0.55),
    });

    let quoteToY = currentY - 14;
    page.drawText(truncateText(customerFullName, 38), {
      x: MARGIN,
      y: quoteToY,
      size: 11,
      font: boldFont,
      color: rgb(0.12, 0.15, 0.18),
    });
    quoteToY -= 14;

    if (customer?.company_name && customer.company_name !== customerFullName) {
      page.drawText(truncateText(customer.company_name, 40), {
        x: MARGIN,
        y: quoteToY,
        size: 9,
        font: regularFont,
        color: rgb(0.35, 0.4, 0.45),
      });
      quoteToY -= 12;
    }

    if (propertyAddress) {
      page.drawText(truncateText(propertyAddress, 42), {
        x: MARGIN,
        y: quoteToY,
        size: 8.5,
        font: regularFont,
        color: rgb(0.35, 0.4, 0.45),
      });
      quoteToY -= 12;
    }

    if (customer?.email) {
      page.drawText(truncateText(customer.email, 40), {
        x: MARGIN,
        y: quoteToY,
        size: 8.5,
        font: regularFont,
        color: rgb(0.35, 0.4, 0.45),
      });
      quoteToY -= 12;
    }

    if (customer?.phone) {
      page.drawText(truncateText(customer.phone, 30), {
        x: MARGIN,
        y: quoteToY,
        size: 8.5,
        font: regularFont,
        color: rgb(0.35, 0.4, 0.45),
      });
      quoteToY -= 12;
    }

    // Col 2: QUOTE DETAILS
    page.drawText(isEs ? 'DATOS DE LA COTIZACIÓN' : 'QUOTE DETAILS', {
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

    drawDetailRow(isEs ? 'Fecha de Cotización:' : 'Quote Date:', formatDate(estimate.created_at));
    drawDetailRow(isEs ? 'Título de Servicio:' : 'Service Title:', truncateText(estimate.title || 'General Service', 24));
    drawDetailRow(isEs ? 'Condiciones de Pago:' : 'Payment Terms:', paymentTerms);
    drawDetailRow(isEs ? 'Moneda:' : 'Currency:', currency);

    // -------------------------------------------------------------
    // LINE ITEMS TABLE
    // -------------------------------------------------------------
    currentY = Math.min(quoteToY, detailsY) - 20;

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

    const rateHeader = isEs ? 'PRECIO UNITARIO' : 'UNIT PRICE';
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

    // Render Line Items
    const rowHeight = 32;
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const isEven = i % 2 === 0;

      page.drawRectangle({
        x: MARGIN,
        y: currentY - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: isEven ? rgb(1, 1, 1) : rgb(0.98, 0.99, 1),
        borderColor: rgb(0.9, 0.92, 0.95),
        borderWidth: 1,
      });

      page.drawText(truncateText(item.name, 48), {
        x: colDescX,
        y: currentY - 15,
        size: 9,
        font: boldFont,
        color: rgb(0.12, 0.15, 0.18),
      });

      page.drawText(isEs ? 'Servicio presupuestado' : 'Quoted service item', {
        x: colDescX,
        y: currentY - 25,
        size: 7,
        font: regularFont,
        color: rgb(0.5, 0.55, 0.6),
      });

      page.drawText('1', {
        x: colQtyX + 5,
        y: currentY - 18,
        size: 9,
        font: regularFont,
        color: rgb(0.2, 0.25, 0.3),
      });

      const priceStr = formatCurrency(item.price, currency);
      const priceWidth = regularFont.widthOfTextAtSize(priceStr, 9);
      page.drawText(priceStr, {
        x: colRateX + 35 - priceWidth,
        y: currentY - 18,
        size: 9,
        font: regularFont,
        color: rgb(0.2, 0.25, 0.3),
      });

      const totalLineStr = formatCurrency(item.price, currency);
      const totalLineWidth = boldFont.widthOfTextAtSize(totalLineStr, 9);
      page.drawText(totalLineStr, {
        x: colTotalX - totalLineWidth,
        y: currentY - 18,
        size: 9,
        font: boldFont,
        color: rgb(0.1, 0.12, 0.15),
      });

      currentY -= rowHeight;
    }

    // -------------------------------------------------------------
    // FINANCIAL SUMMARY & TOTALS SECTION
    // -------------------------------------------------------------
    currentY -= 14;
    const totalsBoxWidth = 240;
    const totalsBoxX = PAGE_WIDTH - MARGIN - totalsBoxWidth;

    // Subtotal
    const subtotalLabel = isEs ? 'Subtotal Cotizado:' : 'Quoted Subtotal:';
    page.drawText(subtotalLabel, {
      x: totalsBoxX,
      y: currentY,
      size: 9,
      font: regularFont,
      color: rgb(0.35, 0.4, 0.45),
    });
    const subtotalVal = formatCurrency(totalAmount, currency);
    const subtotalWidth = boldFont.widthOfTextAtSize(subtotalVal, 9);
    page.drawText(subtotalVal, {
      x: PAGE_WIDTH - MARGIN - 8 - subtotalWidth,
      y: currentY,
      size: 9,
      font: boldFont,
      color: rgb(0.1, 0.12, 0.15),
    });

    currentY -= 20;

    // Grand Total Box
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

    const grandTotalLabel = isEs ? 'TOTAL COTIZACIÓN:' : 'TOTAL QUOTE:';
    const grandTotalValue = formatCurrency(totalAmount, currency);
    const grandTotalTextY = grandTotalBoxY + 8;

    page.drawText(grandTotalLabel, {
      x: totalsBoxX,
      y: grandTotalTextY,
      size: 10.5,
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

    currentY = grandTotalBoxY - 18;

    // -------------------------------------------------------------
    // NOTES / SCOPE OF WORK SECTION (If any)
    // -------------------------------------------------------------
    const footerY = 32;
    const footerLineY = footerY + 14;
    const bottomBoxHeight = 56;
    const bottomBoxY = footerLineY + 14;
    const bottomBoxTopY = bottomBoxY + bottomBoxHeight;

    if (notes && notes.trim() && currentY > bottomBoxTopY + 40) {
      const notesBoxHeight = Math.min(64, currentY - bottomBoxTopY - 10);
      const notesBoxY = currentY - notesBoxHeight;

      page.drawRectangle({
        x: MARGIN,
        y: notesBoxY,
        width: CONTENT_WIDTH,
        height: notesBoxHeight,
        color: rgb(0.99, 0.99, 1),
        borderColor: rgb(0.9, 0.92, 0.95),
        borderWidth: 1,
      });

      page.drawText(isEs ? 'NOTAS / ALCANCE DEL TRABAJO' : 'NOTES / SCOPE OF WORK', {
        x: MARGIN + 12,
        y: notesBoxY + notesBoxHeight - 14,
        size: 8,
        font: boldFont,
        color: rgb(0.3, 0.35, 0.4),
      });

      const cleanNotes = notes.replace(/\r?\n/g, ' ').trim();
      page.drawText(truncateText(cleanNotes, 90), {
        x: MARGIN + 12,
        y: notesBoxY + notesBoxHeight - 28,
        size: 8,
        font: regularFont,
        color: rgb(0.35, 0.4, 0.45),
      });

      if (cleanNotes.length > 90) {
        page.drawText(truncateText(cleanNotes.slice(90), 90), {
          x: MARGIN + 12,
          y: notesBoxY + notesBoxHeight - 40,
          size: 8,
          font: regularFont,
          color: rgb(0.35, 0.4, 0.45),
        });
      }
    }

    // -------------------------------------------------------------
    // BOTTOM TERMS & ACCEPTANCE (Anchored near bottom)
    // -------------------------------------------------------------
    page.drawRectangle({
      x: MARGIN,
      y: bottomBoxY,
      width: CONTENT_WIDTH,
      height: bottomBoxHeight,
      color: rgb(0.98, 0.99, 1),
      borderColor: rgb(0.88, 0.9, 0.94),
      borderWidth: 1,
    });

    page.drawText(isEs ? 'TÉRMINOS Y ACEPTACIÓN DE LA COTIZACIÓN' : 'QUOTE TERMS & ACCEPTANCE', {
      x: MARGIN + 12,
      y: bottomBoxTopY - 14,
      size: 8,
      font: boldFont,
      color: rgb(0.3, 0.35, 0.4),
    });

    const quoteNote = isEs
      ? `Términos: ${paymentTerms}. Esta cotización es válida por 30 días a partir de su emisión.`
      : `Terms: ${paymentTerms}. This quote is valid for 30 days from the date of issuance.`;

    page.drawText(truncateText(quoteNote, 85), {
      x: MARGIN + 12,
      y: bottomBoxTopY - 28,
      size: 8,
      font: regularFont,
      color: rgb(0.25, 0.3, 0.35),
    });

    page.drawText(
      isEs
        ? '¡Gracias por su interés en nuestros servicios!'
        : 'Thank you for considering our services!',
      {
        x: MARGIN + 12,
        y: bottomBoxTopY - 44,
        size: 8.5,
        font: boldFont,
        color: brandColorRgb,
      }
    );

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
    const filename = `Quote-${formattedEstNumber}.pdf`;

    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Quote PDF generation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate quote PDF.';
    return new NextResponse(message, { status: 500 });
  }
}
