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
      title: 'Create your first customer and service site',
      summary: 'Add a customer profile and attach a service site so jobs can be scheduled correctly.',
      keywords: ['customer', 'client', 'service site', 'property', 'address', 'new customer'],
      steps: [
        'Open Dashboard > Customers and click Add New Customer.',
        'Fill in first name, last name, contact email, and phone, then save the profile.',
        'Open the customer record and go to Service Sites.',
        'Add the service address, city, state, ZIP, and any gate code details.',
        'Confirm the new site appears under the customer before scheduling jobs.',
      ],
      quickReply:
        'To create your first customer, go to Dashboard > Customers and use Add New Customer. After saving, open that customer and add a Service Site with the full address. Once that is done, you can schedule jobs against that site.',
    },
    es: {
      title: 'Crea tu primer cliente y sitio de servicio',
      summary: 'Registra un cliente y agrega su ubicacion de servicio para poder programar trabajos correctamente.',
      keywords: ['cliente', 'sitio', 'servicio', 'propiedad', 'direccion', 'nuevo cliente'],
      steps: [
        'Abre Dashboard > Customers y haz clic en Add New Customer.',
        'Completa nombre, apellido, correo y telefono, y guarda el perfil.',
        'Abre la ficha del cliente y entra a Service Sites.',
        'Agrega direccion, ciudad, estado, codigo postal y detalles de acceso si aplica.',
        'Verifica que el sitio aparezca en el cliente antes de programar trabajos.',
      ],
      quickReply:
        'Para crear tu primer cliente, ve a Dashboard > Customers y usa Add New Customer. Luego abre ese cliente y agrega el Service Site con la direccion completa. Despues de eso podras programar trabajos para ese sitio.',
    },
  },
  {
    slug: 'schedule-a-job-and-assign-a-truck',
    audience: 'subscriber',
    en: {
      title: 'Schedule a job and assign a truck',
      summary: 'Create a scheduled job linked to customer/service site and assign resources.',
      keywords: ['schedule', 'job', 'truck', 'dispatch', 'assign', 'calendar'],
      steps: [
        'Open Dashboard > Schedule and click Schedule Job.',
        'Pick the customer and service site for the visit.',
        'Set the date and time window for the appointment.',
        'Assign a truck and confirm assigned technician details if needed.',
        'Save the job, then verify it appears on the schedule board.',
      ],
      quickReply:
        'To schedule a job, go to Dashboard > Schedule, choose customer and service site, set date/time, assign a truck, and save. The job should immediately appear on your schedule board.',
    },
    es: {
      title: 'Programa un trabajo y asigna un camion',
      summary: 'Crea un trabajo programado vinculado al cliente/sitio de servicio y asigna recursos.',
      keywords: ['programar', 'trabajo', 'camion', 'despacho', 'asignar', 'calendario'],
      steps: [
        'Abre Dashboard > Schedule y haz clic en Schedule Job.',
        'Selecciona el cliente y el sitio de servicio.',
        'Define fecha y ventana horaria de la visita.',
        'Asigna un camion y confirma detalles del tecnico si aplica.',
        'Guarda el trabajo y verifica que aparezca en la agenda.',
      ],
      quickReply:
        'Para programar un trabajo, ve a Dashboard > Schedule, selecciona cliente y sitio, define fecha/hora, asigna camion y guarda. El trabajo debe aparecer de inmediato en tu agenda.',
    },
  },
  {
    slug: 'send-estimate-and-convert-to-invoice',
    audience: 'subscriber',
    en: {
      title: 'Send an estimate and convert it to an invoice',
      summary: 'Build estimate line items, deliver estimate, and convert accepted work into invoice flow.',
      keywords: ['estimate', 'invoice', 'send', 'convert', 'billing', 'quote'],
      steps: [
        'Open Dashboard > Estimates and click Create Estimate.',
        'Add customer, service details, pricing, and terms.',
        'Send the estimate to the customer by email from the estimate action menu.',
        'When approved, open the estimate and use Convert to Invoice.',
        'Review invoice totals and due date, then send the invoice.',
      ],
      quickReply:
        'Create the estimate in Dashboard > Estimates, send it by email, and once approved use Convert to Invoice from the same estimate record. Then review due date/amount and send the invoice.',
    },
    es: {
      title: 'Envia una estimacion y conviertela en factura',
      summary: 'Crea lineas de estimacion, enviala al cliente y convierte trabajo aprobado en factura.',
      keywords: ['estimacion', 'factura', 'enviar', 'convertir', 'cobro', 'cotizacion'],
      steps: [
        'Abre Dashboard > Estimates y haz clic en Create Estimate.',
        'Agrega cliente, servicios, precios y terminos.',
        'Envia la estimacion por correo desde el menu de acciones.',
        'Cuando sea aprobada, abre la estimacion y usa Convert to Invoice.',
        'Revisa montos y fecha de vencimiento, luego envia la factura.',
      ],
      quickReply:
        'Crea la estimacion en Dashboard > Estimates, enviala por correo y cuando sea aprobada usa Convert to Invoice en esa misma estimacion. Luego revisa monto/fecha y envia la factura.',
    },
  },
  {
    slug: 'import-export-csv-data',
    audience: 'subscriber',
    en: {
      title: 'Import and export CSV data',
      summary: 'Use CSV templates and import/export controls for customers, jobs, expenses, and estimates.',
      keywords: ['import', 'export', 'csv', 'template', 'upload', 'download'],
      steps: [
        'Open Dashboard > Import / Export (owner/admin roles only).',
        'Download the matching CSV template for the data type.',
        'Populate required columns exactly as template headers.',
        'Upload the file using Import Data and wait for completion message.',
        'Use Export Data buttons to download current records for backup/audit.',
      ],
      quickReply:
        'Go to Dashboard > Import / Export, download the right template, keep header names unchanged, upload through Import Data, and confirm success before proceeding with additional files.',
    },
    es: {
      title: 'Importa y exporta datos CSV',
      summary: 'Usa plantillas CSV y controles de importacion/exportacion para clientes, trabajos, gastos y estimaciones.',
      keywords: ['importar', 'exportar', 'csv', 'plantilla', 'subir', 'descargar'],
      steps: [
        'Abre Dashboard > Import / Export (solo owner/admin).',
        'Descarga la plantilla CSV del tipo de dato que necesitas.',
        'Completa columnas requeridas respetando encabezados de plantilla.',
        'Sube el archivo en Import Data y espera confirmacion.',
        'Usa Export Data para descargar registros actuales de respaldo/auditoria.',
      ],
      quickReply:
        'Ve a Dashboard > Import / Export, descarga la plantilla correcta, no cambies encabezados, sube el archivo en Import Data y confirma el resultado antes de seguir con otros archivos.',
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
        'Open Dashboard > Settings > Team Settings.',
        'Invite member by email and choose role (member/admin/accountant/viewer).',
        'Confirm invitation status and accepted users list.',
        'Adjust role if responsibilities change.',
        'Remove user access when no longer needed.',
      ],
      quickReply:
        'To manage team access, use Dashboard > Settings > Team Settings. Invite by email, assign the correct role, and update/remove access as responsibilities change.',
    },
    es: {
      title: 'Permisos de equipo y control de acceso',
      summary: 'Invita miembros y asigna roles para que cada persona tenga el nivel de acceso correcto.',
      keywords: ['equipo', 'rol', 'permiso', 'invitar', 'acceso', 'admin', 'owner'],
      steps: [
        'Abre Dashboard > Settings > Team Settings.',
        'Invita por correo y elige rol (member/admin/accountant/viewer).',
        'Confirma estado de invitacion y usuarios aceptados.',
        'Ajusta roles cuando cambien responsabilidades.',
        'Elimina acceso cuando ya no sea necesario.',
      ],
      quickReply:
        'Para gestionar acceso del equipo, usa Dashboard > Settings > Team Settings. Invita por correo, asigna el rol correcto y actualiza o elimina acceso cuando cambien responsabilidades.',
    },
  },
  {
    slug: 'stripe-connect-setup',
    audience: 'subscriber',
    en: {
      title: 'Stripe Connect onboarding basics',
      summary: 'Connect Stripe account for payment acceptance and payouts where plan permits.',
      keywords: ['stripe', 'connect', 'payment', 'payout', 'onboarding', 'billing'],
      steps: [
        'Open Dashboard > Settings > Integrations.',
        'Start Stripe Connect onboarding from the Stripe section.',
        'Complete business identity and bank payout details in Stripe.',
        'Return to Prado and confirm connection status is active.',
        'Retry invoice payment links if they were created before setup.',
      ],
      quickReply:
        'Open Settings > Integrations and complete Stripe Connect onboarding, including business verification and payout details. Once status is active, invoice payment links should work as expected.',
    },
    es: {
      title: 'Fundamentos de configuracion Stripe Connect',
      summary: 'Conecta Stripe para aceptar pagos y habilitar depositos segun el plan.',
      keywords: ['stripe', 'connect', 'pago', 'deposito', 'onboarding', 'cobro'],
      steps: [
        'Abre Dashboard > Settings > Integrations.',
        'Inicia onboarding de Stripe Connect desde la seccion Stripe.',
        'Completa identidad comercial y datos bancarios en Stripe.',
        'Regresa a Prado y confirma estado de conexion activa.',
        'Reintenta links de pago de facturas creadas antes de la conexion.',
      ],
      quickReply:
        'Abre Settings > Integrations y completa onboarding de Stripe Connect, incluida verificacion del negocio y datos de deposito. Cuando el estado este activo, los links de pago de facturas deben funcionar correctamente.',
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
  return value.trim().toLowerCase();
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
