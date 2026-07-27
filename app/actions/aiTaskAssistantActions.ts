'use server';

import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { getUserOrganization } from '@/lib/organization';

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

  if (/add customer|new customer|nuevo cliente|crear cliente|client profile/i.test(lower)) {
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

export async function parseTaskPrompt(
  prompt: string,
  locale: string = 'en'
): Promise<ParseTaskPromptResult> {
  try {
    if (!prompt || !prompt.trim()) {
      return {
        success: false,
        intent: 'job',
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
        intent: 'job',
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
        intent: 'job',
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

    const intent = detectIntent(prompt);
    const promptLower = prompt.toLowerCase();

    // Matching logic for references
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

    // Intent-specific parsing
    let parsedJob: ParsedJobTask | undefined;
    let parsedCustomer: ParsedCustomer | undefined;
    let parsedProperty: ParsedProperty | undefined;
    let parsedTruck: ParsedTruck | undefined;
    let parsedService: ParsedService | undefined;
    let parsedEstimate: ParsedEstimate | undefined;

    if (intent === 'customer') {
      const emailMatch = prompt.match(/[\w.-]+@[\w.-]+\.\w+/);
      const phoneMatch = prompt.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

      // Name extraction
      const nameParts = prompt.replace(/add customer|new customer|crear cliente|cliente/gi, '').trim().split(/\s+/);
      const firstName = nameParts[0] || 'New';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Customer';

      parsedCustomer = {
        firstName,
        lastName,
        companyName: null,
        email: emailMatch ? emailMatch[0] : null,
        phone: phoneMatch ? phoneMatch[0] : null,
      };
    } else if (intent === 'property') {
      const addressMatch = prompt.replace(/add property|new site|location|for|para/gi, '').trim();
      parsedProperty = {
        customerId: matchedCustomer?.id || null,
        customerName: matchedCustomer?.name || null,
        streetAddress: addressMatch || '123 Main St',
        gateCodes: null,
      };
    } else if (intent === 'truck') {
      const truckName = prompt.replace(/add truck|new vehicle|nuevo camion|plate/gi, '').trim();
      const plateMatch = prompt.match(/\b([A-Z0-9]{3,8}-?[A-Z0-9]{3,8})\b/i);
      parsedTruck = {
        name: truckName || 'Fleet Truck',
        plateNumber: plateMatch ? plateMatch[1] : null,
      };
    } else if (intent === 'service') {
      const serviceName = prompt.replace(/add service|new service|for|\$\d+/gi, '').trim();
      parsedService = {
        name: serviceName || 'New Service Catalog Item',
        basePrice: costAmount || 150,
        isRecurringDefault: false,
        recurrenceIntervalDays: null,
      };
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
      // Default: Job
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
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown parsing error';
    return {
      success: false,
      intent: 'job',
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

      const { error } = await supabaseAdmin.from('estimates').insert([
        {
          organization_id: org.id,
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
