'use server';

import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/lib/supabaseServer';
import { createAdminClient } from '@/lib/supabaseAdmin';
import { getUserOrganization } from '@/lib/organization';
import { reserveDocumentNumber } from '@/lib/documentNumbers';

export type AIIntent = 'job' | 'customer' | 'property' | 'truck' | 'service' | 'estimate';

export interface ParsedJobTask {
  customerId: string | null;
  customerName: string | null;
  propertyId: string | null;
  propertyAddress: string | null;
  serviceId: string | null;
  serviceName: string | null;
  truckId: string | null;
  truckName: string | null;
  scheduledDate: string | null; // YYYY-MM-DD
  costAmount: number | null;
  notes: string | null;
  confidence: number; // 0 to 100
  missingFields: string[];
}

export interface ParsedCustomer {
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
}

export interface ParsedProperty {
  customerId: string | null;
  customerName: string | null;
  streetAddress: string;
  gateCodes: string | null;
}

export interface ParsedTruck {
  name: string;
  plateNumber: string | null;
}

export interface ParsedService {
  name: string;
  basePrice: number | null;
  isRecurringDefault: boolean;
  recurrenceIntervalDays: number | null;
}

export interface ParsedEstimate {
  customerId: string | null;
  customerName: string | null;
  propertyId: string | null;
  propertyAddress: string | null;
  serviceId: string | null;
  serviceName: string | null;
  totalAmount: number | null;
  notes: string | null;
}

export interface ParseTaskPromptResult {
  success: boolean;
  intent: AIIntent;
  parsedJob?: ParsedJobTask;
  parsedCustomer?: ParsedCustomer;
  parsedProperty?: ParsedProperty;
  parsedTruck?: ParsedTruck;
  parsedService?: ParsedService;
  parsedEstimate?: ParsedEstimate;
  error?: string;
  availableCustomers: { id: string; name: string }[];
  availableServices: { id: string; name: string; base_price: number | null }[];
  availableProperties: { id: string; address: string; customerId: string }[];
  availableTrucks: { id: string; name: string }[];
  usedLLM?: boolean;
}

/**
 * Helper to parse relative date expressions into YYYY-MM-DD string
 */
function parseRelativeDate(text: string): string | null {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes('today') || lower.includes('hoy')) {
    return now.toISOString().split('T')[0];
  }

  if (lower.includes('tomorrow') || lower.includes('mañana')) {
    const tm = new Date(now.getTime() + 86400000);
    return tm.toISOString().split('T')[0];
  }

  const inDaysMatch = lower.match(/in (\d+) days/);
  if (inDaysMatch && inDaysMatch[1]) {
    const days = parseInt(inDaysMatch[1], 10);
    const target = new Date(now.getTime() + days * 86400000);
    return target.toISOString().split('T')[0];
  }

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < daysOfWeek.length; i++) {
    if (lower.includes(daysOfWeek[i]) || lower.includes(`next ${daysOfWeek[i]}`)) {
      const currentDay = now.getDay();
      let distance = i - currentDay;
      if (distance <= 0) distance += 7;
      const targetDate = new Date(now.getTime() + distance * 86400000);
      return targetDate.toISOString().split('T')[0];
    }
  }

  const dateRegex = /\b(\d{4}-\d{2}-\d{2})\b/;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    return dateMatch[1];
  }

  const usDateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (usDateMatch) {
    const m = usDateMatch[1].padStart(2, '0');
    const d = usDateMatch[2].padStart(2, '0');
    const y = usDateMatch[3];
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Extracts dollar amounts ($XXX or XXX dollars)
 */
function parseCostAmount(text: string): number | null {
  const dollarMatch = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  if (dollarMatch) {
    const val = parseFloat(dollarMatch[1]);
    if (Number.isFinite(val) && val > 0) return val;
  }

  const numberDollarsMatch = text.match(/(\d+(?:\.\d{1,2})?)\s*(?:dollars|usd|dolares)/i);
  if (numberDollarsMatch) {
    const val = parseFloat(numberDollarsMatch[1]);
    if (Number.isFinite(val) && val > 0) return val;
  }

  return null;
}

/**
 * Helper to detect primary creation intent
 */
function detectIntent(text: string): AIIntent {
  const lower = text.toLowerCase();

  if (/add customer|create customer|new customer|nuevo cliente|crear cliente|client profile|customer named|client named/i.test(lower)) {
    return 'customer';
  }

  if (/add property|new property|new site|new location|nueva propiedad|add address|direccion/i.test(lower)) {
    return 'property';
  }

  if (/add truck|new truck|new vehicle|nuevo camion|fleet vehicle|camion/i.test(lower)) {
    return 'truck';
  }

  if (/add service|new service|nuevo servicio|catalog item|tipo de servicio/i.test(lower)) {
    return 'service';
  }

  if (/create estimate|new estimate|new quote|presupuesto|cotizacion|bid/i.test(lower)) {
    return 'estimate';
  }

  return 'job';
}

function capitalizeWords(str: string): string {
  if (!str) return '';
  return str
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim();
}

/**
 * Customer Name & Contact Local Parser
 */
function parseCustomerFromPrompt(prompt: string): ParsedCustomer {
  const emailMatch = prompt.match(/[\w.-]+@[\w.-]+\.\w+/i);
  const phoneMatch = prompt.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

  let text = prompt;
  if (emailMatch) text = text.replace(emailMatch[0], ' ');
  if (phoneMatch) text = text.replace(phoneMatch[0], ' ');

  let companyName: string | null = null;
  const companyMatch = text.match(/\b(?:from|at|company|empresa)\s+([A-Za-z0-9\s]+?)(?=\s+(?:email|phone|correo|telefono|\$)|$)/i);
  if (companyMatch) {
    companyName = companyMatch[1].trim();
    text = text.replace(companyMatch[0], ' ');
  }

  text = text.replace(/^(?:please\s+)?(?:create|add|register|make|insert|schedule)\s+(?:a\s+|an\s+)?(?:new\s+)?(?:customer|client)?\s*(?:named|called|dado|llamado|de nombre)?/gi, '');
  text = text.replace(/^(?:crear|agregar|registrar|nuevo)\s+(?:un\s+)?(?:cliente)?\s*(?:llamado|de nombre)?/gi, '');
  text = text.replace(/\b(?:create|add|new|customer|client|named|called|llamado|de nombre|crear|cliente|nuevo)\b/gi, ' ');
  text = text.replace(/[,;:.!]+/g, ' ').trim();

  const words = text.split(/\s+/).filter((w) => w.length > 0);

  let firstName = 'Doris';
  let lastName = 'Sarmiento';

  if (words.length === 1) {
    firstName = words[0];
    lastName = '';
  } else if (words.length >= 2) {
    firstName = words[0];
    lastName = words.slice(1).join(' ');
  }

  return {
    firstName: capitalizeWords(firstName),
    lastName: capitalizeWords(lastName),
    companyName: companyName ? capitalizeWords(companyName) : null,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null,
  };
}

/**
 * Property Address Local Parser
 */
function parsePropertyFromPrompt(
  prompt: string,
  matchedCustomer: { id: string; name: string } | null
): ParsedProperty {
  let text = prompt;
  text = text.replace(/^(?:please\s+)?(?:create|add|register|make)\s+(?:a\s+|an\s+)?(?:new\s+)?(?:property|service location|site|address|location)?\s*(?:named|for|para)?/gi, '');
  text = text.replace(/^(?:crear|agregar|nueva)\s+(?:propiedad|direccion|ubicacion)?\s*(?:para)?/gi, '');

  if (matchedCustomer) {
    const custParts = matchedCustomer.name.split(/\s+/);
    for (const part of custParts) {
      if (part.length > 2) {
        text = text.replace(new RegExp(`\\b${part}\\b`, 'gi'), ' ');
      }
    }
  }

  text = text.replace(/\b(?:for|para|customer|client|cliente|property|address|direccion)\b/gi, ' ');
  text = text.replace(/[,;:.!]+/g, ' ').trim();

  return {
    customerId: matchedCustomer?.id || null,
    customerName: matchedCustomer?.name || null,
    streetAddress: text ? capitalizeWords(text) : '123 Main St',
    gateCodes: null,
  };
}

/**
 * Fleet Truck Local Parser
 */
function parseTruckFromPrompt(prompt: string): ParsedTruck {
  const plateMatch = prompt.match(/\b([A-Z0-9]{3,8}-?[A-Z0-9]{3,8})\b/i);

  let text = prompt;
  if (plateMatch) text = text.replace(plateMatch[0], ' ');

  text = text.replace(/^(?:please\s+)?(?:create|add|register|make)\s+(?:a\s+|an\s+)?(?:new\s+)?(?:truck|vehicle|fleet truck|fleet vehicle)?\s*(?:named|with plate|plate)?/gi, '');
  text = text.replace(/^(?:crear|agregar|nuevo)\s+(?:camion|vehiculo)?\s*(?:con placas|placas)?/gi, '');
  text = text.replace(/\b(?:truck|vehicle|camion|vehiculo|fleet|plate|placas|with)\b/gi, ' ');
  text = text.replace(/[,;:.!]+/g, ' ').trim();

  return {
    name: text ? capitalizeWords(text) : 'Fleet Truck',
    plateNumber: plateMatch ? plateMatch[1].toUpperCase() : null,
  };
}

/**
 * Service Catalog Item Local Parser
 */
function parseServiceFromPrompt(prompt: string, costAmount: number | null): ParsedService {
  let text = prompt;
  text = text.replace(/\$\s*\d+(?:\.\d{1,2})?/g, ' ');
  text = text.replace(/\d+(?:\.\d{1,2})?\s*(?:dollars|usd|dolares)/gi, ' ');

  text = text.replace(/^(?:please\s+)?(?:create|add|register|make)\s+(?:a\s+|an\s+)?(?:new\s+)?(?:service|service item|catalog item)?\s*(?:named|for|costing)?/gi, '');
  text = text.replace(/^(?:crear|agregar|nuevo)\s+(?:servicio)?\s*(?:por)?/gi, '');
  text = text.replace(/\b(?:service|servicio|catalog|item|for|por|cost|price|precio)\b/gi, ' ');
  text = text.replace(/[,;:.!]+/g, ' ').trim();

  return {
    name: text ? capitalizeWords(text) : 'New Service Catalog Item',
    basePrice: costAmount || 150,
    isRecurringDefault: false,
    recurrenceIntervalDays: null,
  };
}

/**
 * Call Google Gemini 2.5 Flash API for natural language reasoning & structured JSON generation
 */
async function callGeminiAI(
  prompt: string,
  availableCustomers: { id: string; name: string }[],
  availableServices: { id: string; name: string; base_price: number | null }[],
  availableProperties: { id: string; address: string; customerId: string }[],
  availableTrucks: { id: string; name: string }[]
): Promise<Partial<ParseTaskPromptResult> | null> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
You are the AI Operations Assistant for Prado Field Service ERP.
Analyze the user's natural language request and map it to a structured creation payload.

Current Date: ${new Date().toISOString().split('T')[0]}
Available Customers: ${JSON.stringify(availableCustomers)}
Available Properties: ${JSON.stringify(availableProperties)}
Available Services: ${JSON.stringify(availableServices)}
Available Trucks: ${JSON.stringify(availableTrucks)}

Rules:
1. Determine the intent: "job", "customer", "property", "truck", "service", or "estimate".
2. Match customer, property, service, or truck IDs from the available context arrays whenever relevant.
3. For Customer intent: extract firstName, lastName, companyName (or null), email (or null), phone (or null).
4. For Property intent: extract customerId (from context if matched), customerName, streetAddress, gateCodes.
5. For Truck intent: extract name, plateNumber.
6. For Service intent: extract name, basePrice (number).
7. For Estimate intent: extract customerId, customerName, propertyId, propertyAddress, serviceId, serviceName, totalAmount (number), notes.
8. For Job intent: extract customerId, customerName, propertyId, propertyAddress, serviceId, serviceName, truckId, truckName, scheduledDate (YYYY-MM-DD format), costAmount (number), notes, confidence (number 0-100), missingFields (string array).

Respond strictly with a JSON object.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Request: "${prompt}"` }] }
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);
    if (!data || !data.intent) return null;

    return data;
  } catch (err) {
    console.warn('Gemini LLM parsing fallback to local rules:', err);
    return null;
  }
}

export async function parseTaskPrompt(
  prompt: string,
  locale: string = 'en'
): Promise<ParseTaskPromptResult> {
  try {
    if (!prompt || !prompt.trim()) {
      return {
        success: false,
        intent: 'estimate',
        error: 'Prompt cannot be empty',
        availableCustomers: [],
        availableServices: [],
        availableProperties: [],
        availableTrucks: [],
      };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        intent: 'estimate',
        error: 'Authentication required',
        availableCustomers: [],
        availableServices: [],
        availableProperties: [],
        availableTrucks: [],
      };
    }

    const { organization: org } = await getUserOrganization(user.id);
    if (!org) {
      return {
        success: false,
        intent: 'estimate',
        error: 'Organization context required',
        availableCustomers: [],
        availableServices: [],
        availableProperties: [],
        availableTrucks: [],
      };
    }

    // Fetch org resources
    const [customersRes, servicesRes, trucksRes] = await Promise.all([
      supabase
        .from('customers')
        .select('id, first_name, last_name, company_name')
        .eq('organization_id', org.id),
      supabase
        .from('services')
        .select('id, name, base_price')
        .eq('organization_id', org.id)
        .order('name', { ascending: true }),
      supabase
        .from('trucks')
        .select('id, name, plate_number')
        .eq('organization_id', org.id)
        .eq('is_active', true),
    ]);

    const rawCustomers = customersRes.data || [];
    const rawServices = servicesRes.data || [];
    const rawTrucks = trucksRes.data || [];

    const availableCustomers = rawCustomers.map((c) => {
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.company_name || 'Unnamed Customer';
      return { id: c.id, name: c.company_name ? `${name} (${c.company_name})` : name };
    });

    const availableServices = rawServices.map((s) => ({
      id: s.id,
      name: s.name,
      base_price: s.base_price ? Number(s.base_price) : null,
    }));

    const availableTrucks = rawTrucks.map((t) => ({
      id: t.id,
      name: t.name,
    }));

    const customerIds = rawCustomers.map((c) => c.id);
    const propertiesRes = customerIds.length > 0
      ? await supabase.from('properties').select('id, street_address, customer_id').in('customer_id', customerIds)
      : { data: [] };

    const rawProperties = propertiesRes.data || [];
    const availableProperties = rawProperties.map((p) => ({
      id: p.id,
      address: p.street_address || 'Address N/A',
      customerId: p.customer_id,
    }));

    // 1. Try Gemini 2.5 Flash LLM parsing
    const llmResult = await callGeminiAI(
      prompt,
      availableCustomers,
      availableServices,
      availableProperties,
      availableTrucks
    );

    if (llmResult && llmResult.intent) {
      return {
        success: true,
        intent: llmResult.intent as AIIntent,
        parsedJob: llmResult.parsedJob as ParsedJobTask | undefined,
        parsedCustomer: llmResult.parsedCustomer as ParsedCustomer | undefined,
        parsedProperty: llmResult.parsedProperty as ParsedProperty | undefined,
        parsedTruck: llmResult.parsedTruck as ParsedTruck | undefined,
        parsedService: llmResult.parsedService as ParsedService | undefined,
        parsedEstimate: llmResult.parsedEstimate as ParsedEstimate | undefined,
        availableCustomers,
        availableServices,
        availableProperties,
        availableTrucks,
        usedLLM: true,
      };
    }

    // 2. Fallback to robust offline NLP rules if LLM key is absent or unreachable
    const intent = detectIntent(prompt);
    const promptLower = prompt.toLowerCase();

    let matchedCustomer: { id: string; name: string } | null = null;
    for (const customer of availableCustomers) {
      const parts = customer.name.toLowerCase().split(/\s+/);
      if (parts.some((p: string) => p.length > 2 && promptLower.includes(p))) {
        matchedCustomer = customer;
        break;
      }
    }

    let matchedProperty: { id: string; address: string } | null = null;
    const candidateProps = matchedCustomer
      ? availableProperties.filter((p) => p.customerId === matchedCustomer.id)
      : availableProperties;

    if (candidateProps.length === 1) {
      matchedProperty = candidateProps[0];
    } else if (candidateProps.length > 1) {
      for (const prop of candidateProps) {
        if (promptLower.includes(prop.address.toLowerCase().split(',')[0])) {
          matchedProperty = prop;
          break;
        }
      }
      if (!matchedProperty) {
        matchedProperty = candidateProps[0];
      }
    }

    let matchedService: { id: string; name: string; base_price: number | null } | null = null;
    for (const service of availableServices) {
      if (promptLower.includes(service.name.toLowerCase())) {
        matchedService = service;
        break;
      }
    }

    let matchedTruck: { id: string; name: string } | null = null;
    for (const truck of availableTrucks) {
      if (promptLower.includes(truck.name.toLowerCase())) {
        matchedTruck = truck;
        break;
      }
    }

    const costAmount = parseCostAmount(prompt);
    const scheduledDate = parseRelativeDate(prompt) || new Date().toISOString().split('T')[0];

    let parsedJob: ParsedJobTask | undefined;
    let parsedCustomer: ParsedCustomer | undefined;
    let parsedProperty: ParsedProperty | undefined;
    let parsedTruck: ParsedTruck | undefined;
    let parsedService: ParsedService | undefined;
    let parsedEstimate: ParsedEstimate | undefined;

    if (intent === 'customer') {
      parsedCustomer = parseCustomerFromPrompt(prompt);
    } else if (intent === 'property') {
      parsedProperty = parsePropertyFromPrompt(prompt, matchedCustomer);
    } else if (intent === 'truck') {
      parsedTruck = parseTruckFromPrompt(prompt);
    } else if (intent === 'service') {
      parsedService = parseServiceFromPrompt(prompt, costAmount);
    } else if (intent === 'estimate') {
      parsedEstimate = {
        customerId: matchedCustomer?.id || null,
        customerName: matchedCustomer?.name || null,
        propertyId: matchedProperty?.id || null,
        propertyAddress: matchedProperty?.address || null,
        serviceId: matchedService?.id || null,
        serviceName: matchedService?.name || null,
        totalAmount: costAmount || (matchedService?.base_price ? Number(matchedService.base_price) : 250),
        notes: `Created via Prado AI Assistant: "${prompt}"`,
      };
    } else {
      const missingFields: string[] = [];
      if (!matchedCustomer) missingFields.push('Customer');
      if (!matchedProperty) missingFields.push('Service Location');
      if (!matchedService) missingFields.push('Service Type');

      let confidence = 100;
      if (missingFields.length > 0) confidence -= missingFields.length * 25;

      parsedJob = {
        customerId: matchedCustomer?.id || null,
        customerName: matchedCustomer?.name || null,
        propertyId: matchedProperty?.id || null,
        propertyAddress: matchedProperty?.address || null,
        serviceId: matchedService?.id || null,
        serviceName: matchedService?.name || null,
        truckId: matchedTruck?.id || null,
        truckName: matchedTruck?.name || null,
        scheduledDate,
        costAmount: costAmount ?? (matchedService?.base_price ? Number(matchedService.base_price) : 0),
        notes: `Created via Prado AI Assistant: "${prompt}"`,
        confidence: Math.max(confidence, 25),
        missingFields,
      };
    }

    return {
      success: true,
      intent,
      parsedJob,
      parsedCustomer,
      parsedProperty,
      parsedTruck,
      parsedService,
      parsedEstimate,
      availableCustomers,
      availableServices,
      availableProperties,
      availableTrucks,
      usedLLM: false,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown parsing error';
    return {
      success: false,
      intent: 'estimate',
      error: errorMsg,
      availableCustomers: [],
      availableServices: [],
      availableProperties: [],
      availableTrucks: [],
    };
  }
}

/**
 * Server Action to execute entity creation for Customer, Property, Truck, Service, or Estimate
 */
export async function executeAICreateEntity(
  intent: AIIntent,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication required' };

    const { organization: org } = await getUserOrganization(user.id);
    if (!org) return { success: false, error: 'Organization required' };

    const supabaseAdmin = createAdminClient();

    if (intent === 'customer') {
      const firstName = (data.firstName as string) || 'New';
      const lastName = (data.lastName as string) || 'Customer';
      const companyName = (data.companyName as string) || null;
      const email = (data.email as string) || null;
      const phone = (data.phone as string) || null;

      const { error } = await supabaseAdmin.from('customers').insert([
        {
          organization_id: org.id,
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
          email,
          phone,
        },
      ]);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Customer "${firstName} ${lastName}" created successfully!` };
    }

    if (intent === 'property') {
      const customerId = data.customerId as string;
      const streetAddress = data.streetAddress as string;
      const gateCodes = (data.gateCodes as string) || null;

      if (!customerId || !streetAddress) {
        return { success: false, error: 'Customer and street address are required.' };
      }

      const { error } = await supabaseAdmin.from('properties').insert([
        {
          customer_id: customerId,
          street_address: streetAddress,
          gate_codes: gateCodes,
        },
      ]);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Service property location created successfully!` };
    }

    if (intent === 'truck') {
      const name = data.name as string;
      const plateNumber = (data.plateNumber as string) || null;

      if (!name) return { success: false, error: 'Truck name is required.' };

      const { error } = await supabaseAdmin.from('trucks').insert([
        {
          organization_id: org.id,
          name,
          plate_number: plateNumber,
          is_active: true,
        },
      ]);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Fleet truck "${name}" added successfully!` };
    }

    if (intent === 'service') {
      const name = data.name as string;
      const basePrice = Number(data.basePrice || 0);

      if (!name) return { success: false, error: 'Service name is required.' };

      const { error } = await supabaseAdmin.from('services').insert([
        {
          organization_id: org.id,
          name,
          base_price: basePrice,
        },
      ]);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Service "${name}" added to catalog successfully!` };
    }

    if (intent === 'estimate') {
      const customerId = data.customerId as string;
      const propertyId = (data.propertyId as string) || null;
      const serviceId = (data.serviceId as string) || null;
      const totalAmount = Number(data.totalAmount || 0);
      const notes = (data.notes as string) || null;

      if (!customerId) return { success: false, error: 'Customer is required for estimate.' };

      const estimateNumber = await reserveDocumentNumber(supabaseAdmin, org.id, 'estimate');

      const { error } = await supabaseAdmin.from('estimates').insert([
        {
          organization_id: org.id,
          estimate_number: estimateNumber,
          customer_id: customerId,
          property_id: propertyId,
          service_id: serviceId,
          total_amount: totalAmount,
          status: 'draft',
          notes,
        },
      ]);
      if (error) return { success: false, error: error.message };
      return { success: true, message: `Estimate created successfully!` };
    }

    return { success: false, error: 'Unsupported creation intent' };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Creation failed' };
  }
}
