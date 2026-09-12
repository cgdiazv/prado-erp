import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function createGuide(locale) {
  const isEs = locale === 'es';
  const pdfDoc = await PDFDocument.create();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Colors
  const cNavy = rgb(0.06, 0.11, 0.18);      // #0f1c2e
  const cGreen = rgb(0.06, 0.72, 0.51);     // #10b981
  const cDark = rgb(0.12, 0.16, 0.22);      // #1f2937
  const cGray = rgb(0.4, 0.45, 0.52);       // #6b7280
  const cLightBg = rgb(0.96, 0.97, 0.98);   // #f3f4f6
  const cBorder = rgb(0.85, 0.88, 0.91);    // #e5e7eb
  const cWhite = rgb(1, 1, 1);

  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 45;
  const printableWidth = pageWidth - marginX * 2; // 522

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight;

  function drawHeader() {
    // Header background banner
    page.drawRectangle({
      x: 0,
      y: pageHeight - 70,
      width: pageWidth,
      height: 70,
      color: cNavy,
    });

    // Top accent bar
    page.drawRectangle({
      x: 0,
      y: pageHeight - 6,
      width: pageWidth,
      height: 6,
      color: cGreen,
    });

    page.drawText('Prado Systems', {
      x: marginX,
      y: pageHeight - 34,
      size: 22,
      font: fontBold,
      color: cWhite,
    });

    const subTitle = isEs
      ? 'Guía Operativa de la Plataforma y Flujos de Trabajo Master'
      : 'Platform Operational Guide and Master Workflows';

    page.drawText(subTitle, {
      x: marginX,
      y: pageHeight - 54,
      size: 11,
      font: fontRegular,
      color: cGreen,
    });

    y = pageHeight - 90;
  }

  function checkPageBreak(neededHeight) {
    if (y - neededHeight < 50) {
      drawFooter();
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      drawHeader();
    }
  }

  function drawFooter() {
    const pageIndex = pdfDoc.getPages().indexOf(page) + 1;
    const footerText = isEs ? `Prado Systems — Guía Operativa | Página ${pageIndex}` : `Prado Systems — Operational Guide | Page ${pageIndex}`;
    
    page.drawLine({
      start: { x: marginX, y: 40 },
      end: { x: pageWidth - marginX, y: 40 },
      thickness: 0.5,
      color: cBorder,
    });

    page.drawText(footerText, {
      x: marginX,
      y: 25,
      size: 9,
      font: fontRegular,
      color: cGray,
    });
  }

  function wrapText(text, fontSize, font, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  function drawParagraph(text, fontSize = 10, font = fontRegular, color = cDark, lineHeight = 14) {
    const lines = wrapText(text, fontSize, font, printableWidth);
    checkPageBreak(lines.length * lineHeight + 5);
    for (const line of lines) {
      page.drawText(line, {
        x: marginX,
        y: y - fontSize,
        size: fontSize,
        font,
        color,
      });
      y -= lineHeight;
    }
    y -= 4;
  }

  function drawSectionHeader(title) {
    checkPageBreak(100);
    y -= 8;
    page.drawText(title, {
      x: marginX,
      y: y - 14,
      size: 14,
      font: fontBold,
      color: cNavy,
    });
    y -= 18;
    page.drawLine({
      start: { x: marginX, y: y },
      end: { x: pageWidth - marginX, y: y },
      thickness: 1,
      color: cGreen,
    });
    y -= 12;
  }

  function drawSubSectionHeader(title) {
    checkPageBreak(25);
    y -= 4;
    page.drawText(title, {
      x: marginX,
      y: y - 12,
      size: 11,
      font: fontBold,
      color: cNavy,
    });
    y -= 16;
  }

  function drawNumberedItem(numStr, boldPrefix, bodyText) {
    const fullText = `${numStr} ${boldPrefix}: ${bodyText}`;
    const lines = wrapText(fullText, 9.5, fontRegular, printableWidth - 15);

    checkPageBreak(lines.length * 13.5 + 4);

    for (const line of lines) {
      page.drawText(line, {
        x: marginX + 10,
        y: y - 9.5,
        size: 9.5,
        font: fontRegular,
        color: cDark,
      });
      y -= 13.5;
    }
    y -= 3;
  }

  function drawFaqItem(question, answer) {
    const qLines = wrapText(question, 10.5, fontBold, printableWidth);
    const rawALines = answer.split('\n');
    const aLines = [];
    for (const rawL of rawALines) {
      const wrapped = wrapText(rawL, 9.5, fontRegular, printableWidth);
      aLines.push(...wrapped);
    }
    
    checkPageBreak((qLines.length + aLines.length) * 14 + 10);

    y -= 4;
    for (const ql of qLines) {
      page.drawText(ql, {
        x: marginX,
        y: y - 10.5,
        size: 10.5,
        font: fontBold,
        color: cGreen,
      });
      y -= 14;
    }
    y -= 2;
    for (const al of aLines) {
      page.drawText(al, {
        x: marginX,
        y: y - 9.5,
        size: 9.5,
        font: fontRegular,
        color: cDark,
      });
      y -= 13.5;
    }
    y -= 6;
  }

  function drawCallout(title, body) {
    const lines = wrapText(body, 9, fontRegular, printableWidth - 30);
    const boxHeight = lines.length * 13 + 26;
    checkPageBreak(boxHeight + 10);

    page.drawRectangle({
      x: marginX,
      y: y - boxHeight,
      width: printableWidth,
      height: boxHeight,
      color: cLightBg,
      borderColor: cBorder,
      borderWidth: 1,
    });

    page.drawRectangle({
      x: marginX,
      y: y - boxHeight,
      width: 4,
      height: boxHeight,
      color: cGreen,
    });

    let boxY = y - 14;
    page.drawText(title, {
      x: marginX + 15,
      y: boxY,
      size: 9.5,
      font: fontBold,
      color: cNavy,
    });
    boxY -= 14;

    for (const l of lines) {
      page.drawText(l, {
        x: marginX + 15,
        y: boxY,
        size: 9,
        font: fontRegular,
        color: cDark,
      });
      boxY -= 13;
    }

    y -= (boxHeight + 12);
  }

  // --- BUILD CONTENT ---
  drawHeader();

  // Intro
  const introText = isEs
    ? 'Bienvenido a la guía oficial de Prado Systems, el centro neurálgico diseñado específicamente para optimizar la producción en planta, la logística de despacho, CRM de clientes, gestión de subcontratistas y la administración financiera en un solo entorno unificado. Este documento describe los flujos operativos clave y responde a las preguntas más frecuentes sobre el funcionamiento de nuestra plataforma.'
    : 'Welcome to the official Prado Systems user guide, the core engine specifically designed to streamline plant production, dispatch logistics, customer CRM, subcontractor management, and financial administration within a single, unified environment. This document highlights critical operational workflows and answers frequently asked questions regarding our platform layout.';

  drawParagraph(introText, 10, fontRegular, cDark, 14);
  y -= 6;

  // SECTION 1
  drawSectionHeader(isEs ? '1. Flujos de Trabajo Críticos Paso a Paso' : '1. Step-by-Step Critical Workflows');

  // 1.A
  drawSubSectionHeader(isEs ? 'A. Gestión Comercial: Desde la Oportunidad hasta la Producción' : 'A. Commercial Management: From Opportunity to Production');

  if (isEs) {
    drawNumberedItem('1.', 'Registro de Clientes en el CRM', 'Acceda al módulo Customer CRM en el panel izquierdo. Registre perfiles comerciales de clientes, contactos clave, historial de requerimientos y configuraciones de facturación iniciales.');
    drawNumberedItem('2.', 'Elaboración de Cotizaciones (Quotes)', 'Diríjase a la sección Quotes. Desarrolle propuestas profesionales detallando materiales, recubrimientos arquitectónicos, formulaciones de mezcla y costos de mano de obra para su cliente.');
    drawNumberedItem('3.', 'Aprobación Digital', 'Presente la cotización (Quote) a su cliente. Una vez confirmada y validada internamente, marque el estado de la propuesta como aprobada.');
    drawNumberedItem('4.', 'Conversión Directa a Trabajo (Job)', 'Con la cotización aprobada, la plataforma habilita la opción de transferir los datos operativos directamente al programador de planta creando un Job activo, eliminando la duplicidad en el ingreso de datos.');
  } else {
    drawNumberedItem('1.', 'Customer Registration in CRM', 'Access the Customer CRM module on the left panel. Register customer profiles, contact histories, tax settings, and operational requirements.');
    drawNumberedItem('2.', 'Drafting Quotes', 'Head over to the Quotes section. Build detailed cost proposals specifying requested materials, architectural coatings, paint formulations, and labor, generating a clear digital quote for your customer.');
    drawNumberedItem('3.', 'Digital Approval', 'Present the quote to your customer. Once confirmed and internally validated, update the quote status to approved.');
    drawNumberedItem('4.', 'Direct Conversion to Job', 'With the approved quote, the platform automatically enables the option to push operational details into the plant scheduling module as an active Job. This eliminates duplicate data entry and accelerates the value chain.');
  }
  y -= 6;

  // 1.B
  drawSubSectionHeader(isEs ? 'B. Ejecución en Planta, Subcontratistas y Logística de Despacho' : 'B. Plant Execution, Subcontractor Management & Dispatch Logistics');

  if (isEs) {
    drawNumberedItem('1.', 'Planificación Operativa (Job Scheduling)', 'Los Jobs transferidos aparecen inmediatamente en el programador de tareas. El supervisor puede asignar cada Job a un operario, tina de mezclado o turno de trabajo en el calendario maestro.');
    drawNumberedItem('2.', 'Asignación y Permisos de Subcontratistas', 'Vincule subcontratistas externos a Jobs específicos, restrinja sus accesos mediante perfiles de permisos dedicados y monitoree los costos de subcontratación y márgenes de rentabilidad del trabajo en tiempo real.');
    drawNumberedItem('3.', 'Monitoreo de Estado en Tiempo Real', 'A medida que el equipo avanza en la igualación de color o la fabricación del lote, el estado de las tareas del Job se actualiza instantáneamente hasta su finalización.');
    drawNumberedItem('4.', 'Optimización de Despachos (Dispatch Routing)', 'Los lotes finalizados se consolidan en el módulo de despacho. El encargado de logística organiza las rutas de entrega más eficientes y asigna los Vehículos correspondientes de la flota.');
  } else {
    drawNumberedItem('1.', 'Operational Planning (Job Scheduling)', 'Transferred Jobs immediately appear on the master task scheduler. Supervisors can allocate each Job to specific operators, mixing tanks, or production shifts.');
    drawNumberedItem('2.', 'Subcontractor Allocation & Permissions', 'Assign third-party subcontractors to specialized Jobs, scope their portal access via dedicated permission roles, and track job profitability and margins in real time.');
    drawNumberedItem('3.', 'Real-Time Status Tracking', 'As the team progresses through color matching or batch manufacturing, task statuses for the Job update in real time until marked as completed.');
    drawNumberedItem('4.', 'Dispatch Route & Vehicle Optimization', 'Finalized production batches are consolidated within the dispatch module. Logistics managers build efficient delivery routes and assign dedicated fleet Vehicles, generating manifests for drivers.');
  }
  y -= 6;

  // 1.C
  drawSubSectionHeader(isEs ? 'C. Ciclo Financiero y Sincronización Contable' : 'C. Financial Cycle and Accounting Synchronization');

  if (isEs) {
    drawNumberedItem('1.', 'Emisión de Facturas (Invoices) y Pagos Stripe', 'Una vez entregado el producto, genere la factura (Invoice). Mediante la integración con Stripe Connect, los clientes reciben un enlace directo para pagar en línea de forma segura con tarjeta o billeteras digitales.');
    drawNumberedItem('2.', 'Control de Egresos en Planta', 'Registre cualquier adquisición de suministros, compras de materia prima, mantenimientos o costos de subcontratación en el Expense Ledger.');
    drawNumberedItem('3.', 'Enlace Contable Automatizado (QuickBooks & Xero)', 'Sincronice facturas y egresos con un solo clic. El sistema genera borradores contables directamente en QuickBooks Online (QBO) o Xero, manteniendo consistencia absoluta entre la operación y los libros financieros.');
  } else {
    drawNumberedItem('1.', 'Invoice Issuance & Stripe Online Payments', 'Once product delivery is confirmed, issue the Invoice. Integrated Stripe Connect payment links allow customers to pay receivables instantly online via credit card or digital wallet.');
    drawNumberedItem('2.', 'Plant Outlay & Expense Tracking', 'Record procurement of supplies, raw material purchases, machinery servicing, or subcontractor outlays directly in the Expense Ledger.');
    drawNumberedItem('3.', 'Automated Accounting Link (QuickBooks & Xero)', 'Through secure integrations with platforms like QuickBooks Online (QBO) and Xero, logged inlays and outlays can be dispatched with a single click as bill and invoice drafts directly inside your accounting backend.');
  }

  y -= 6;
  const noteTitle = isEs ? 'Nota de Eficiencia & Control Operativo:' : 'Efficiency & Operational Control Note:';
  const noteBody = isEs
    ? 'Toda la información financiera, estado de Jobs, cobranzas por Stripe y margen de subcontratistas se consolidan en tiempo real en el Dashboard de Prado, permitiendo un análisis inmediato del rendimiento corporativo.'
    : 'All financial metrics, Job progress, Stripe payment statuses, and subcontractor margins consolidated across these workflows are aggregated instantly inside the Prado Dashboard, providing high-level performance insights at a single glance.';
  drawCallout(noteTitle, noteBody);

  // SECTION 2
  drawSectionHeader(isEs ? '2. Preguntas Frecuentes y Estructura del Entorno' : '2. Frequently Asked Questions and Workspace Structure');

  if (isEs) {
    drawFaqItem(
      '¿Cómo se adapta Prado al tamaño de mi organización?',
      'Prado está diseñado bajo un modelo flexible y escalable. Contamos con niveles de servicio adaptados para contratistas independientes, planes optimizados para talleres en crecimiento que requieren vincular equipos de hasta 5 roles de trabajo, y soluciones corporativas ilimitadas para medianas o grandes empresas que manejan flujos multifábrica.'
    );
    drawFaqItem(
      '¿Cómo funciona la integración y seguridad de datos financieros?',
      'Prado utiliza protocolos OAuth 2.0 avanzados para conectarse de forma segura con Stripe Connect para pagos digitales y plataformas de contabilidad como QuickBooks Online (QBO) y Xero. Esto garantiza un intercambio de información cifrado sin almacenar contraseñas bancarias o credenciales críticas.'
    );
    drawFaqItem(
      '¿Cuáles son los roles de acceso disponibles para mi equipo?',
      'Para resguardar la seguridad de la información, Prado cuenta con 6 perfiles de acceso bien definidos:\n' +
      '• Owner (Propietario): Control total del espacio de trabajo, configuraciones globales y suscripción.\n' +
      '• Manager (Gerente): Visualización global, administración de usuarios y ajustes de la operación.\n' +
      '• Supervisor / Coordinator: Gestión activa del día a día (CRM, Quotes, Job Scheduling).\n' +
      '• Subcontractor (Subcontratista): Acceso restringido únicamente a sus Jobs asignados y actualización de tareas.\n' +
      '• Accountant (Contador): Acceso a cobros, facturas, libros de gastos y sincronización contable (Stripe, QBO, Xero).\n' +
      '• Analyst / Observer: Perfil de solo lectura para auditorías y tableros métricos.'
    );
    drawFaqItem(
      '¿Prado incluye guías de ayuda y soporte en pantalla?',
      'Sí. La plataforma incluye una Biblioteca de Guías Paso a Paso (How-To Library) y un Asistente Automático de Ayuda (Helpdesk Auto Assistant) integrado para responder consultas de uso en tiempo real.'
    );
    drawFaqItem(
      '¿Es posible migrar información histórica a Prado?',
      'Sí. A través del módulo Import / Export, los administradores pueden cargar de forma masiva bases de datos de clientes e inventarios mediante archivos CSV o planillas de cálculo, permitiendo una transición limpia y rápida.'
    );
  } else {
    drawFaqItem(
      'How does Prado scale with the size of my organization?',
      'Prado is built on a highly flexible model. We offer tailored service tiers suitable for independent contractors operating solo, optimized environments for growing workshops connecting teams of up to 5 user roles, and unlimited enterprise solutions for mid-sized to large organizations managing complex multi-department frameworks.'
    );
    drawFaqItem(
      'How does financial integration handle secure data syncing and digital payments?',
      'Prado leverages advanced OAuth 2.0 protocols to connect externally with Stripe Connect for instant customer invoice payments, as well as accounting platforms like QuickBooks Online (QBO) and Xero. This guarantees encrypted data exchange without storing critical banking credentials.'
    );
    drawFaqItem(
      'What access roles are available for my team members?',
      'To safeguard workspace security, Prado features 6 clearly defined access profiles:\n' +
      '• Owner: Full access to the workspace, global system settings, and subscription management.\n' +
      '• Manager: Workspace-wide visibility, team member administration, and operational adjustments.\n' +
      '• Supervisor / Coordinator: Active day-to-day coordination capabilities (CRM, Quotes, Job Scheduling).\n' +
      '• Subcontractor: Scoped access restricted specifically to assigned Jobs, progress updates, and task completion.\n' +
      '• Accountant: Specialized access to invoice lifecycles, expense ledgers, Stripe Connect, and QBO/Xero accounting sync.\n' +
      '• Analyst / Observer: Secure read-only profile ideal for external audits or passive monitoring of metrics.'
    );
    drawFaqItem(
      'Does Prado feature built-in guidance and support?',
      'Yes. Prado includes an interactive How-To Library and an automated Helpdesk Assistant directly in the user interface to assist users with step-by-step guidance.'
    );
    drawFaqItem(
      'Can I migrate historical business data into Prado?',
      'Yes. Utilizing the Import / Export module, administrators can batch-upload customer directories and initial inventory sheets using standard CSV or spreadsheet formats, ensuring a fast and smooth transition.'
    );
  }

  // Draw footer on final page
  drawFooter();

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(process.cwd(), 'public', isEs ? 'prado_guia_operativa_website.pdf' : 'prado_operational_guide_website_en.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`Successfully generated ${outputPath} (${pdfBytes.length} bytes, ${pdfDoc.getPageCount()} pages)`);
}

async function main() {
  await createGuide('es');
  await createGuide('en');
}

main().catch(err => {
  console.error('Error generating user guides:', err);
  process.exit(1);
});
