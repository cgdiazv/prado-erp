export type HowToPlaybook = {
  slug: string;
  title: string;
  audience: 'subscriber' | 'management';
  summary: string;
  keywords: string[];
  steps: string[];
  quickReply: string;
};

type HowToPlaybookSeed = {
  slug: string;
  audience: 'subscriber' | 'management';
  en: Omit<HowToPlaybook, 'slug' | 'audience'>;
  es: Omit<HowToPlaybook, 'slug' | 'audience'>;
};

const HOW_TO_PLAYBOOKS_SEED: HowToPlaybookSeed[] = [
  {
    slug: 'create-first-customer-and-service-site',
    audience: 'subscriber',
    en: {
      title: 'Create a Customer and service site',
      summary: 'Add billing and service addresses, then manage Job history and Invoices from the Customer record.',
      keywords: ['customer', 'service site', 'job site', 'address', 'new customer', 'customer details', 'customer search', 'jobs log', 'invoice', 'paid balance', 'unpaid balance'],
      steps: [
        'Open Dashboard > Customers and select Add New Customer.',
        'Enter contact details, a Billing Address, and a Job Site Address. Choose Same as billing if they share an address, then save.',
        'Search by name or phone, filter by paid or unpaid balance, then open a Customer to review its Jobs Log or Invoices.',
      ],
      quickReply:
        'Go to Dashboard > Customers and select Add New Customer. Enter contact details and the billing address, then enter a Job Site Address or choose Same as billing and save. To find an existing Customer, search by name or phone and use the Paid Balance or Unpaid Balance filter. Open the Customer record to manage service sites, review the Jobs Log, or open Invoices.',
    },
    es: {
      title: 'Crea un cliente y un sitio de servicio',
      summary: 'Agrega direcciones de facturación y servicio, y administra trabajos y facturas desde el registro del cliente.',
      keywords: ['cliente', 'sitio de servicio', 'sitio de trabajo', 'dirección', 'nuevo cliente', 'detalles del cliente', 'registro de trabajos', 'factura'],
      steps: [
        'Abre Dashboard > Clientes y selecciona Añadir nuevo cliente.',
        'Ingresa los datos de contacto, la dirección de facturación y la dirección del sitio de trabajo. Elige Igual que facturación si comparten dirección y guarda.',
        'Busca por nombre o teléfono, filtra por saldo pagado o pendiente y abre el cliente para revisar Registro de trabajos o Facturas.',
      ],
      quickReply:
        'Ve a Dashboard > Clientes y selecciona Añadir nuevo cliente. Ingresa los datos de contacto y la dirección de facturación; después agrega la dirección del sitio de trabajo o elige Igual que facturación y guarda. Para encontrar un cliente existente, busca por nombre o teléfono y usa el filtro de saldo pagado o pendiente. Abre el registro para administrar sitios de servicio, revisar Registro de trabajos o consultar Facturas.',
    },
  },
  {
    slug: 'schedule-and-manage-a-job',
    audience: 'subscriber',
    en: {
      title: 'Schedule and manage a Job',
      summary: 'Schedule a Job for a Customer and use list, calendar, status, and Vehicle controls to manage it.',
      keywords: ['schedule', 'job', 'vehicle', 'calendar', 'list view', 'status', 'recurring', 'date'],
      steps: [
        'Open Dashboard > Job Scheduling and click Schedule Job.',
        'Choose a Customer, service site, Service, and scheduled date. Assign a Vehicle if available, then save.',
        'Switch between List and Calendar, filter by Job status or Vehicle, and select a Job to update its schedule details.',
      ],
      quickReply:
        'Go to Dashboard > Job Scheduling and click Schedule Job. Choose the Customer and service site, select a Service and date, assign a Vehicle if available, then save. Use List or Calendar to review Jobs, filter by status or Vehicle, and select a Job to update its date or assignment.',
    },
    es: {
      title: 'Programa y administra un Job',
      summary: 'Programa un Job para un cliente y usa las vistas de lista, calendario y filtros de estado y vehículo.',
      keywords: ['programar', 'job', 'vehículo', 'calendario', 'lista', 'estado', 'recurrente', 'fecha'],
      steps: [
        'Abre Dashboard > Programación de Jobs y selecciona Programar trabajo.',
        'Elige el cliente, el sitio de servicio, el servicio y la fecha. Asigna un vehículo si está disponible y guarda.',
        'Cambia entre Lista y Calendario, filtra por estado o vehículo y selecciona un Job para actualizar su programación.',
      ],
      quickReply:
        'Ve a Dashboard > Programación de Jobs y selecciona Programar trabajo. Elige el cliente y el sitio de servicio, selecciona el servicio y la fecha, asigna un vehículo si está disponible y guarda. Usa Lista o Calendario para revisar los Jobs, filtrar por estado o vehículo y actualizar una fecha o asignación.',
    },
  },
  {
    slug: 'create-send-and-approve-a-quote',
    audience: 'subscriber',
    en: {
      title: 'Create, send, and approve a Quote',
      summary: 'Build a Quote with service, labor, or materials, then approve it to schedule a Job.',
      keywords: ['quote', 'quotes', 'customer', 'service', 'labor', 'materials', 'scope', 'send quote', 'approve quote'],
      steps: [
        'Open Dashboard > Quotes, click New Quote, and choose a Customer and service site.',
        'Add Service, Labor, or Materials line items. Review the customer total and internal profitability if your role allows it, then add payment terms or scope notes and save.',
        'Use Send to email the Quote. When approved, select Approve, choose a date, and select Approve and Create Job.',
      ],
      quickReply:
        'Create a Quote in Dashboard > Quotes and select the Customer and service site. Add Service, Labor, or Materials line items, review the customer total and internal profitability if your role allows it, add terms or scope notes, and save. Send the Quote by email from its actions. When it is approved, choose Approve, select the Job date, and use Approve and Create Job. Create an Invoice separately when you are ready to bill.',
    },
    es: {
      title: 'Crea, envía y aprueba una cotización',
      summary: 'Crea una cotización con servicios, mano de obra o materiales y apruébala para programar un Job.',
      keywords: ['cotización', 'cliente', 'servicio', 'mano de obra', 'materiales', 'alcance', 'enviar cotización', 'aprobar cotización'],
      steps: [
        'Abre Dashboard > Cotizaciones, selecciona Nueva cotización y elige un cliente y sitio de servicio.',
        'Agrega servicios, mano de obra o materiales. Revisa el total para el cliente y la rentabilidad interna si tu rol permite verla, agrega términos o notas del alcance y guarda.',
        'Usa Enviar para mandar la cotización por correo. Cuando se apruebe, selecciona Aprobar, elige una fecha y usa Aprobar y crear Job.',
      ],
      quickReply:
        'Crea una cotización en Dashboard > Cotizaciones y selecciona el cliente y el sitio de servicio. Agrega servicios, mano de obra o materiales, revisa el total y la rentabilidad interna si tu rol permite verla, agrega términos o notas y guarda. Envía la cotización por correo desde sus acciones. Cuando se apruebe, selecciona Aprobar, elige la fecha del Job y usa Aprobar y crear Job. Crea una factura por separado cuando estés listo para cobrar.',
    },
  },
  {
    slug: 'import-export-csv-data',
    audience: 'subscriber',
    en: {
      title: 'Import or export CSV records',
      summary: 'Use the updated Import and Export tabs and templates for Customers, Jobs, Expenses, and Quotes.',
      keywords: ['import', 'export', 'csv', 'template', 'upload', 'download', 'system settings'],
      steps: [
        'Open Dashboard > System Settings > Import / Export. This area is available to Owner and Admin roles.',
        'On the Import tab, download the matching template, keep its column headers, upload the CSV, and wait for the completion message.',
        'On the Export tab, download records for Customers, Jobs, Expenses, or Quotes.',
      ],
      quickReply:
        'Go to Dashboard > System Settings > Import / Export (Owner or Admin access). On Import, download the template for Customers, Jobs, Expenses, or Quotes, keep the headers unchanged, upload the CSV, and wait for the completion message. On Export, choose a record type to download its CSV.',
    },
    es: {
      title: 'Importa o exporta registros CSV',
      summary: 'Usa las pestañas de Importar y Exportar y sus plantillas para clientes, Jobs, gastos y cotizaciones.',
      keywords: ['importar', 'exportar', 'csv', 'plantilla', 'subir', 'descargar', 'configuración del sistema'],
      steps: [
        'Abre Dashboard > Configuración del sistema > Importar / Exportar. Esta sección está disponible para roles Owner y Admin.',
        'En Importar, descarga la plantilla correspondiente, conserva los encabezados, sube el CSV y espera el mensaje de confirmación.',
        'En Exportar, descarga registros de clientes, Jobs, gastos o cotizaciones.',
      ],
      quickReply:
        'Ve a Dashboard > Configuración del sistema > Importar / Exportar (acceso Owner o Admin). En Importar, descarga la plantilla de clientes, Jobs, gastos o cotizaciones, conserva los encabezados, sube el CSV y espera la confirmación. En Exportar, elige el tipo de registro para descargar su archivo CSV.',
    },
  },
  {
    slug: 'team-permissions-and-access',
    audience: 'subscriber',
    en: {
      title: 'Team permissions and access control',
      summary: 'Invite team members and set roles so each person has proper access level.',
      keywords: ['team', 'role', 'permission', 'invite', 'access', 'admin', 'owner'],
      steps: [
        'Open Dashboard > System Settings > Team Settings.',
        'Invite a team member by email and choose the appropriate role.',
        'Review invitation status, update roles when responsibilities change, or remove access when it is no longer needed.',
      ],
      quickReply:
        'To manage team access, use Dashboard > System Settings > Team Settings. Invite by email, assign the correct role, and update or remove access as responsibilities change.',
    },
    es: {
      title: 'Permisos de equipo y control de acceso',
      summary: 'Invita miembros y asigna roles para que cada persona tenga el nivel de acceso correcto.',
      keywords: ['equipo', 'rol', 'permiso', 'invitar', 'acceso', 'admin', 'owner'],
      steps: [
        'Abre Dashboard > Configuración del sistema > Configuración de equipo.',
        'Invita a un miembro por correo y elige el rol apropiado.',
        'Revisa el estado de la invitación, actualiza roles o elimina el acceso cuando ya no sea necesario.',
      ],
      quickReply:
        'Para gestionar el acceso del equipo, usa Dashboard > Configuración del sistema > Configuración de equipo. Invita por correo, asigna el rol correcto y actualiza o elimina el acceso cuando cambien las responsabilidades.',
    },
  },
  {
    slug: 'complete-job-with-photos',
    audience: 'subscriber',
    en: {
      title: 'Complete a Job with photos and notes',
      summary: 'Record completion details, attach proof-of-work photos, and review them in the Customer Jobs Log.',
      keywords: ['complete job', 'completion', 'photos', 'technician notes', 'customer jobs log', 'labor costs', 'material costs'],
      steps: [
        'In Dashboard > Job Scheduling, find the scheduled Job and open Complete Job.',
        'Set the completion date, add optional Technician Notes, and attach up to six Completion Photos.',
        'Complete the Job, then open the Customer record > Jobs Log and select View Photos.',
      ],
      quickReply:
        'In Dashboard > Job Scheduling, open the scheduled Job and select Complete Job. Set the completion date, add optional Technician Notes, and attach up to six photos. Submit the completion; photos are included in the customer email and can be reviewed from the Customer record under Jobs Log > View Photos. Labor and materials costs from the linked Quote are logged to Expense Ledger when the Job is completed.',
    },
    es: {
      title: 'Completa un Job con fotos y notas',
      summary: 'Registra los detalles de finalización, adjunta fotos del trabajo y revísalas en Registro de trabajos del cliente.',
      keywords: ['completar job', 'finalización', 'fotos', 'notas del técnico', 'registro de trabajos', 'costos de mano de obra', 'costos de materiales'],
      steps: [
        'En Dashboard > Programación de Jobs, busca el Job programado y abre Completar Job.',
        'Indica la fecha de finalización, agrega Notas del técnico opcionales y adjunta hasta seis fotos.',
        'Completa el Job; después abre el registro del cliente > Registro de trabajos y selecciona Ver fotos.',
      ],
      quickReply:
        'En Dashboard > Programación de Jobs, abre el Job programado y selecciona Completar Job. Indica la fecha de finalización, agrega Notas del técnico opcionales y adjunta hasta seis fotos. Envía la finalización; las fotos se incluyen en el correo al cliente y puedes revisarlas en el registro del cliente, en Registro de trabajos > Ver fotos. Los costos de mano de obra y materiales de la cotización vinculada se registran en el Libro de gastos al completar el Job.',
    },
  },
  {
    slug: 'create-and-issue-invoice',
    audience: 'subscriber',
    en: {
      title: 'Create and issue an Invoice',
      summary: 'Create an Invoice from the ledger or a Customer record, add payment details, and issue it.',
      keywords: ['invoice', 'new invoice', 'issue invoice', 'due date', 'payment terms', 'invoice photos', 'customer invoice'],
      steps: [
        'Open Dashboard > Invoices Ledger > New Invoice, or open a Customer record and select Invoices > New Invoice.',
        'Choose the Customer and Service, enter the amount and due date, then add notes or finished-work photos if needed.',
        'Review the Invoice Summary and email option, then select Create & Issue Invoice. Confirm the new Invoice appears in the ledger or Customer record.',
      ],
      quickReply:
        'Create an Invoice from Dashboard > Invoices Ledger > New Invoice, or from the Invoices tab on a Customer record. Select the Customer and Service, enter the amount and due date, and add payment terms, notes, or finished-work photos if needed. Review the total and email option, then select Create & Issue Invoice. Attached photos are included in the invoice email and PDF.',
    },
    es: {
      title: 'Crea y emite una factura',
      summary: 'Crea una factura desde el libro o desde un registro de cliente, agrega los datos de pago y emítela.',
      keywords: ['factura', 'nueva factura', 'emitir factura', 'fecha de vencimiento', 'términos de pago', 'fotos de factura', 'factura de cliente'],
      steps: [
        'Abre Dashboard > Invoices Ledger > Nueva factura, o abre un cliente y selecciona Facturas > Nueva factura.',
        'Elige el cliente y el servicio, ingresa el monto y la fecha de vencimiento y agrega notas o fotos del trabajo si hace falta.',
        'Revisa el resumen de la factura y la opción de correo, emítela y confirma que aparezca en el libro o en Facturas del cliente.',
      ],
      quickReply:
        'Crea una factura desde Dashboard > Invoices Ledger > Nueva factura o desde la pestaña Facturas del registro de un cliente. Selecciona el cliente y el servicio, ingresa el monto y la fecha de vencimiento y agrega términos de pago, notas o fotos del trabajo si hace falta. Revisa el total y la opción de correo y selecciona Emitir factura. Las fotos adjuntas se incluyen en el correo y el PDF de la factura.',
    },
  },
  {
    slug: 'record-and-review-expenses',
    audience: 'subscriber',
    en: {
      title: 'Record and review expenses',
      summary: 'Log a manual expense, optionally link it to a Job, and understand when Quote costs are recorded automatically.',
      keywords: ['expense', 'expense ledger', 'log expense', 'vendor', 'category', 'amount', 'job expense', 'quote costs'],
      steps: [
        'Open Dashboard > Expense Ledger and select Log Expense.',
        'Enter the date, category, vendor, amount, and description; optionally link the expense to a Job and save.',
        'Review the Expense Ledger. Labor and materials costs from a linked Quote are recorded automatically when its Job is completed.',
      ],
      quickReply:
        'Go to Dashboard > Expense Ledger and select Log Expense. Enter the expense date, category, vendor, amount, and description; you can also link it to a Job. Save the entry to add it to the ledger. Labor and materials costs from a linked Quote are logged automatically when the Job is completed.',
    },
    es: {
      title: 'Registra y revisa gastos',
      summary: 'Registra un gasto manual, vincúlalo opcionalmente a un Job y conoce cuándo se registran costos automáticamente.',
      keywords: ['gasto', 'libro de gastos', 'registrar gasto', 'proveedor', 'categoría', 'monto', 'gasto de job', 'costos de cotización'],
      steps: [
        'Abre Dashboard > Libro de gastos y selecciona Registrar gasto.',
        'Ingresa fecha, categoría, proveedor, monto y descripción; puedes vincular el gasto a un Job y guardar.',
        'Revisa el libro de gastos. Los costos de mano de obra y materiales de una cotización vinculada se registran al completar el Job.',
      ],
      quickReply:
        'Ve a Dashboard > Libro de gastos y selecciona Registrar gasto. Ingresa la fecha, categoría, proveedor, monto y descripción; también puedes vincularlo a un Job. Guarda el registro para agregarlo al libro. Los costos de mano de obra y materiales de una cotización vinculada se registran automáticamente al completar el Job.',
    },
  },
  {
    slug: 'create-and-print-reports',
    audience: 'subscriber',
    en: {
      title: 'Create a date-filtered report and PDF',
      summary: 'Choose a report, apply a preset or custom date range, and print or save the result as a PDF.',
      keywords: ['report', 'reports', 'date range', 'custom range', 'pdf', 'print', 'revenue', 'expenses', 'quote conversion'],
      steps: [
        'Open Dashboard > Reports and choose Revenue, Expenses, Job Performance, Customer Status, Quote Conversion, or Weekly Schedule.',
        'Choose Last 30 days, Current quarter, Current year, or Custom range; set and apply dates for a custom range.',
        'Select Generate Print View, then Print / Save PDF.',
      ],
      quickReply:
        'Open Dashboard > Reports and choose a report type. Set the period to Last 30 days, Current quarter, Current year, or Custom range. For a custom range, choose the start and end dates and apply them. Select Generate Print View, then Print / Save PDF to print or save the report.',
    },
    es: {
      title: 'Crea un reporte por fechas y guárdalo en PDF',
      summary: 'Elige un reporte, aplica un período predefinido o personalizado e imprime o guarda el resultado como PDF.',
      keywords: ['reporte', 'reportes', 'rango de fechas', 'rango personalizado', 'pdf', 'imprimir', 'ingresos', 'gastos', 'conversión de cotizaciones'],
      steps: [
        'Abre Dashboard > Reportes y elige ingresos, gastos, rendimiento de Jobs, estado de clientes, conversión de cotizaciones o agenda semanal.',
        'Elige últimos 30 días, trimestre actual, año actual o rango personalizado; define y aplica las fechas si usas un rango personalizado.',
        'Selecciona Generar vista de impresión y luego Imprimir / Guardar PDF.',
      ],
      quickReply:
        'Abre Dashboard > Reportes y elige el tipo de reporte. Define el período como últimos 30 días, trimestre actual, año actual o rango personalizado. Para un rango personalizado, elige las fechas de inicio y fin y aplícalas. Selecciona Generar vista de impresión y luego Imprimir / Guardar PDF.',
    },
  },
  {
    slug: 'dispatch-and-optimize-routes',
    audience: 'subscriber',
    en: {
      title: 'Assign Jobs and optimize dispatch routes',
      summary: 'Assign scheduled Jobs to Vehicles, optimize route order, and assign drivers from Dispatch Routing.',
      keywords: ['dispatch', 'dispatch routing', 'route', 'vehicle', 'auto-assign', 'optimize route', 'driver', 'unassigned jobs'],
      steps: [
        'Open Dashboard > Dispatch Routing and review the Map and Unassigned Jobs.',
        'Assign a Job to a Vehicle, or select Auto-Assign All to distribute unassigned Jobs.',
        'Review each Vehicle route, select Optimize Route, and assign a Driver if applicable.',
      ],
      quickReply:
        'Open Dashboard > Dispatch Routing. Review the Map and Unassigned Jobs, then assign each Job to a Vehicle or select Auto-Assign All. In the Routes view, review each Vehicle route, select Optimize Route to update its stop order, and assign a Driver if applicable. Check for missing location warnings if a Job cannot be routed.',
    },
    es: {
      title: 'Asigna Jobs y optimiza rutas de despacho',
      summary: 'Asigna Jobs programados a vehículos, optimiza el orden de las rutas y asigna conductores.',
      keywords: ['despacho', 'rutas', 'ruta', 'vehículo', 'asignación automática', 'optimizar ruta', 'conductor', 'jobs sin asignar'],
      steps: [
        'Abre Dashboard > Despacho y revisa el mapa y los Jobs sin asignar.',
        'Asigna un Job a un vehículo o selecciona Asignar todos automáticamente.',
        'Revisa la ruta de cada vehículo, selecciona Optimizar ruta y asigna un conductor si corresponde.',
      ],
      quickReply:
        'Abre Dashboard > Despacho. Revisa el mapa y los Jobs sin asignar; luego asigna cada Job a un vehículo o selecciona Asignar todos automáticamente. En la vista de rutas, revisa cada ruta, selecciona Optimizar ruta para actualizar el orden de las paradas y asigna un conductor si corresponde. Revisa las alertas de ubicación faltante si no se puede enrutar un Job.',
    },
  },
  {
    slug: 'configure-document-defaults',
    audience: 'subscriber',
    en: {
      title: 'Configure Quote and Invoice defaults',
      summary: 'Use the updated Documents Settings tabs to manage billing, labor and materials, and document defaults.',
      keywords: ['document settings', 'billing defaults', 'labor markup', 'materials markup', 'tax rate', 'payment terms', 'quote number', 'invoice number'],
      steps: [
        'Open Dashboard > System Settings > Documents Settings.',
        'Use Billing Defaults for tax settings and Labor & Markups for labor rates and materials markup.',
        'Use Docs & Emails to manage Quote and Invoice numbering, default payment terms, and document email branding; save your changes.',
      ],
      quickReply:
        'Open Dashboard > System Settings > Documents Settings. In Billing Defaults, review tax settings. In Labor & Markups, update labor rates or materials markup. In Docs & Emails, manage Quote and Invoice numbering, default payment terms, and document email branding, then save your changes.',
    },
    es: {
      title: 'Configura valores predeterminados de cotizaciones y facturas',
      summary: 'Usa las pestañas de Configuración de documentos para administrar facturación, mano de obra, materiales y documentos.',
      keywords: ['configuración de documentos', 'preferencias de facturación', 'márgenes de mano de obra', 'margen de materiales', 'impuesto', 'términos de pago', 'número de cotización', 'número de factura'],
      steps: [
        'Abre Dashboard > Configuración del sistema > Configuración de documentos.',
        'Usa Preferencias de facturación para los impuestos y Mano de obra y márgenes para las tarifas y el margen de materiales.',
        'Usa Documentos y correos para administrar la numeración, términos de pago y apariencia de los correos; guarda los cambios.',
      ],
      quickReply:
        'Abre Dashboard > Configuración del sistema > Configuración de documentos. En Preferencias de facturación, revisa los impuestos. En Mano de obra y márgenes, actualiza tarifas o márgenes de materiales. En Documentos y correos, administra la numeración de cotizaciones y facturas, los términos de pago predeterminados y la apariencia del correo; después guarda los cambios.',
    },
  },
  {
    slug: 'stripe-connect-setup',
    audience: 'subscriber',
    en: {
      title: 'Stripe Connect onboarding basics',
      summary: 'Connect Stripe for payment acceptance and payouts where the plan permits.',
      keywords: ['stripe', 'connect', 'payment', 'payout', 'onboarding', 'billing'],
      steps: [
        'Open Dashboard > System Settings > Integrations and start Stripe Connect onboarding.',
        'Complete business identity verification and bank payout details in Stripe.',
        'Return to the Integrations page and confirm the status is active; retry older invoice payment links if needed.',
      ],
      quickReply:
        'Open Dashboard > System Settings > Integrations and complete Stripe Connect onboarding, including business verification and payout details. Once status is active, invoice payment links should work as expected.',
    },
    es: {
      title: 'Fundamentos de configuración de Stripe Connect',
      summary: 'Conecta Stripe para aceptar pagos y habilitar depósitos según el plan.',
      keywords: ['stripe', 'connect', 'pago', 'depósito', 'onboarding', 'cobro'],
      steps: [
        'Abre Dashboard > Configuración del sistema > Integraciones e inicia Stripe Connect.',
        'Completa la verificación del negocio y los datos bancarios para depósitos en Stripe.',
        'Regresa a Integraciones y confirma que el estado esté activo; reintenta enlaces de pago antiguos si hace falta.',
      ],
      quickReply:
        'Abre Dashboard > Configuración del sistema > Integraciones y completa onboarding de Stripe Connect, incluida verificación del negocio y datos de depósito. Cuando el estado esté activo, los links de pago de facturas deben funcionar correctamente.',
    },
  },
];

export function getHowToPlaybooks(locale: string): HowToPlaybook[] {
  const isEs = locale.toLowerCase().startsWith('es');

  return HOW_TO_PLAYBOOKS_SEED.map((item) => {
    const localized = isEs ? item.es : item.en;
    return {
      slug: item.slug,
      audience: item.audience,
      title: localized.title,
      summary: localized.summary,
      keywords: localized.keywords,
      steps: localized.steps,
      quickReply: localized.quickReply,
    };
  });
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function findHowToMatches(question: string, limit = 3): HowToPlaybook[] {
  return findHowToMatchesByLocale(question, 'en', limit);
}

export function findHowToMatchesByLocale(question: string, locale: string, limit = 3): HowToPlaybook[] {
  const playbooks = getHowToPlaybooks(locale);
  const normalizedQuestion = normalizeText(question);
  if (!normalizedQuestion) return [];

  const words = normalizedQuestion.split(/\s+/).filter(Boolean);

  const scored = playbooks.map((playbook) => {
    const title = normalizeText(playbook.title);
    const summary = normalizeText(playbook.summary);

    let score = 0;

    for (const keyword of playbook.keywords) {
      const normalizedKeyword = normalizeText(keyword);
      if (normalizedQuestion.includes(normalizedKeyword)) {
        score += normalizedKeyword.includes(' ') ? 4 : 3;
      }
    }

    for (const word of words) {
      if (word.length < 3) continue;
      if (title.includes(word)) score += 2;
      if (summary.includes(word)) score += 1;
    }

    return { playbook, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((item) => item.playbook);
}
