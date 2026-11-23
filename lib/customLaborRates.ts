import type { SupabaseClient } from '@supabase/supabase-js';

export interface CustomLaborRate {
  id: string;
  name: string;
  description: string;
  hourlyCost: number;
  hourlyPrice: number;
}

const AUDIT_ACTION_CUSTOM_LABOR = 'org_custom_labor_rates';

function sanitizeCustomLaborRates(raw: unknown): CustomLaborRate[] {
  if (!Array.isArray(raw)) return [];
  const results: CustomLaborRate[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : '';
    const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : '';
    if (!id || !name) continue;

    const description = typeof record.description === 'string' ? record.description.trim() : '';
    const hourlyCost = Number(record.hourlyCost ?? 0);
    const hourlyPrice = Number(record.hourlyPrice ?? 0);

    results.push({
      id,
      name,
      description,
      hourlyCost: Number.isFinite(hourlyCost) && hourlyCost >= 0 ? Math.round(hourlyCost * 100) / 100 : 0,
      hourlyPrice: Number.isFinite(hourlyPrice) && hourlyPrice >= 0 ? Math.round(hourlyPrice * 100) / 100 : 0,
    });
  }

  return results;
}

export async function loadCustomLaborRates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: SupabaseClient<any>,
  organizationId: string
): Promise<CustomLaborRate[]> {
  try {
    const { data: orgRow, error } = await supabaseAdmin
      .from('organizations')
      .select('custom_labor_rates')
      .eq('id', organizationId)
      .maybeSingle();

    if (!error && orgRow && Array.isArray(orgRow.custom_labor_rates)) {
      return sanitizeCustomLaborRates(orgRow.custom_labor_rates);
    }
  } catch {
    // Fallback to audit_logs if custom_labor_rates column is not yet migrated
  }

  try {
    const { data: logRow } = await supabaseAdmin
      .from('audit_logs')
      .select('metadata')
      .eq('organization_id', organizationId)
      .eq('action', AUDIT_ACTION_CUSTOM_LABOR)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const rates = (logRow?.metadata as Record<string, unknown> | null)?.rates;
    return sanitizeCustomLaborRates(rates);
  } catch {
    return [];
  }
}

export async function saveCustomLaborRates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: SupabaseClient<any>,
  organizationId: string,
  userId: string,
  rates: CustomLaborRate[]
): Promise<{ success: boolean; rates: CustomLaborRate[]; error?: string }> {
  const sanitized = sanitizeCustomLaborRates(rates);

  const { error: updateErr } = await supabaseAdmin
    .from('organizations')
    .update({ custom_labor_rates: sanitized })
    .eq('id', organizationId);

  if (!updateErr) {
    return { success: true, rates: sanitized };
  }

  const isMissingColumn =
    updateErr.code === '42703' ||
    updateErr.message?.includes('custom_labor_rates') ||
    updateErr.message?.includes('schema cache');

  if (!isMissingColumn) {
    return { success: false, rates: sanitized, error: updateErr.message };
  }

  // Fallback persistence in audit_logs when migration hasn't been applied yet
  await supabaseAdmin
    .from('audit_logs')
    .delete()
    .eq('organization_id', organizationId)
    .eq('action', AUDIT_ACTION_CUSTOM_LABOR);

  const { error: logErr } = await supabaseAdmin.from('audit_logs').insert([
    {
      organization_id: organizationId,
      actor_user_id: userId,
      action: AUDIT_ACTION_CUSTOM_LABOR,
      entity_type: 'organization',
      entity_id: organizationId,
      metadata: { rates: sanitized },
    },
  ]);

  if (logErr) {
    return { success: false, rates: sanitized, error: logErr.message };
  }

  return { success: true, rates: sanitized };
}
