import { createAdminClient } from '@/lib/supabaseAdmin';
import { enqueueXeroExpenseBill } from '@/app/actions/xeroActions';
import { formatDocumentNumber } from '@/lib/documentBranding';

export interface StoredQuoteLineItem {
  type?: 'service' | 'labor' | 'material';
  serviceId?: string | null;
  customName?: string;
  name: string;
  price: number;
  hours?: string | number;
  laborRate?: string | number;
  laborCost?: string | number;
  laborTier?: 'default' | 'night' | 'emergency';
  materialCost?: string | number;
  materialMarkup?: string | number;
}

export function isMissingLineItemsColumnError(
  error: { message?: string | null; code?: string | null } | null | undefined
): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  return msg.includes('line_items') && (msg.includes('schema cache') || msg.includes('column') || msg.includes('does not exist'));
}

export async function saveQuoteInternalCostsFallback({
  organizationId,
  estimateId,
  actorUserId,
  actorEmail,
  lineItems,
}: {
  organizationId: string;
  estimateId: string;
  actorUserId: string;
  actorEmail?: string | null;
  lineItems: StoredQuoteLineItem[];
}) {
  try {
    const admin = createAdminClient();
    await admin.from('audit_logs').insert({
      event_type: 'quote_internal_costs',
      organization_id: organizationId,
      actor_user_id: actorUserId,
      actor_email: actorEmail || null,
      metadata: {
        estimate_id: estimateId,
        line_items: lineItems,
      },
    });
  } catch {
    // Ignore if audit_logs is unavailable
  }
}

export async function loadQuoteInternalCostsFallback({
  organizationId,
  estimateId,
}: {
  organizationId: string;
  estimateId: string;
}): Promise<StoredQuoteLineItem[] | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('audit_logs')
      .select('metadata, created_at')
      .eq('organization_id', organizationId)
      .eq('event_type', 'quote_internal_costs')
      .contains('metadata', { estimate_id: estimateId })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && Array.isArray(data?.metadata?.line_items) && data.metadata.line_items.length > 0) {
      return data.metadata.line_items as StoredQuoteLineItem[];
    }
  } catch {
    // Ignore fallback lookup errors
  }

  return null;
}

function parseLineItemsFromDescription(
  description: string | null | undefined,
  defaultLaborCost: number,
  defaultMaterialsMarkup: number
): StoredQuoteLineItem[] {
  const rawDescription = (description || '').trim();
  if (!rawDescription) return [];

  const breakdownLabels = ['Detalle de servicios:', 'Service breakdown:'];
  const breakdownLabel = breakdownLabels.find((label) => rawDescription.includes(label));
  if (!breakdownLabel) return [];

  const parts = rawDescription.split(breakdownLabel);
  const breakdownText = (parts.slice(1).join(breakdownLabel) || '').trim();

  return breakdownText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line): StoredQuoteLineItem | null => {
      const cleaned = line.replace(/^-\s*/, '');
      const match = cleaned.match(/^(.*):\s*\$?([0-9]+(?:\.[0-9]+)?)$/);
      if (!match) return null;

      const itemName = (match[1] || '').trim();
      const itemPrice = Number.parseFloat(match[2] || '0') || 0;

      const laborMatch = itemName.match(/^(.*?)(?:\s*\(([0-9.]+)\s*hrs?\))$/i);
      if (laborMatch) {
        return {
          type: 'labor',
          name: itemName,
          price: itemPrice,
          hours: laborMatch[2],
          laborCost: defaultLaborCost,
        };
      }

      if (/material|suministro/i.test(itemName)) {
        const estimatedCost = itemPrice / (1 + Math.max(0, defaultMaterialsMarkup) / 100);
        return {
          type: 'material',
          name: itemName,
          price: itemPrice,
          materialCost: Number(estimatedCost.toFixed(2)),
          materialMarkup: defaultMaterialsMarkup,
        };
      }

      return {
        type: 'service',
        name: itemName,
        price: itemPrice,
      };
    })
    .filter((item): item is StoredQuoteLineItem => Boolean(item));
}

export function extractConvertedEstimateId(jobNotes: string | null | undefined): string | null {
  if (!jobNotes) return null;
  const match = jobNotes.match(/\[ESTIMATE_CONVERSION_ID:([0-9a-fA-F-]+)\]/);
  return match?.[1] || null;
}

/**
 * Automatically logs Labor and Materials & Supplies expenses into `expenses`
 * when a Job converted from an approved Quote is marked as completed.
 */
export async function logQuoteCostsToExpensesOnJobCompletion({
  supabase,
  organizationId,
  job,
  defaultLaborCost = 45,
  defaultMaterialsMarkup = 30,
}: {
  supabase: any;
  organizationId: string;
  job: {
    id: string;
    job_type: string;
    notes?: string | null;
    subcontractor_pay_amount?: number | string | null;
  };
  defaultLaborCost?: number;
  defaultMaterialsMarkup?: number;
}) {
  const estimateId = extractConvertedEstimateId(job.notes);
  if (!estimateId) return;

  try {
    let estimate: any = null;
    const { data: estWithItems, error: estErr } = await supabase
      .from('estimates')
      .select('id, estimate_number, title, description, line_items')
      .eq('id', estimateId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (estErr && isMissingLineItemsColumnError(estErr)) {
      const { data: estBasic } = await supabase
        .from('estimates')
        .select('id, estimate_number, title, description')
        .eq('id', estimateId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      estimate = estBasic;
    } else {
      estimate = estWithItems;
    }

    if (!estimate) return;

    let lineItems: StoredQuoteLineItem[] = [];
    if (Array.isArray(estimate.line_items) && estimate.line_items.length > 0) {
      lineItems = estimate.line_items as StoredQuoteLineItem[];
    } else {
      const fallbackItems = await loadQuoteInternalCostsFallback({
        organizationId,
        estimateId: estimate.id,
      });
      if (fallbackItems && fallbackItems.length > 0) {
        lineItems = fallbackItems;
      } else {
        lineItems = parseLineItemsFromDescription(
          estimate.description,
          defaultLaborCost,
          defaultMaterialsMarkup
        );
      }
    }

    if (lineItems.length === 0) return;

    let totalLaborCost = 0;
    const laborSummaries: string[] = [];

    let totalMaterialCost = 0;
    const materialSummaries: string[] = [];

    for (const line of lineItems) {
      if (line.type === 'labor') {
        const hours = Number.parseFloat(String(line.hours ?? '0')) || 0;
        const costPerHour =
          line.laborCost != null
            ? Number.parseFloat(String(line.laborCost)) || 0
            : defaultLaborCost;
        const lineCost = Math.round(hours * costPerHour * 100) / 100;
        if (lineCost > 0) {
          totalLaborCost += lineCost;
          laborSummaries.push(`${line.name} @ $${costPerHour.toFixed(2)}/hr`);
        }
      } else if (line.type === 'material') {
        const lineCost =
          line.materialCost != null
            ? Math.round((Number.parseFloat(String(line.materialCost)) || 0) * 100) / 100
            : 0;
        if (lineCost > 0) {
          totalMaterialCost += lineCost;
          materialSummaries.push(line.name);
        }
      }
    }

    totalLaborCost = Math.round(totalLaborCost * 100) / 100;
    totalMaterialCost = Math.round(totalMaterialCost * 100) / 100;

    const formattedQuoteNum =
      formatDocumentNumber('estimate', estimate.estimate_number) || estimate.title || 'Quote';
    const expenseDate = new Date().toISOString().split('T')[0];
    const hasSubcontractorPayout = Number(job.subcontractor_pay_amount || 0) > 0;

    // 1. Log internal Labor cost (skip if job labor was paid via Subcontractor Payout to prevent double-counting)
    if (totalLaborCost > 0 && !hasSubcontractorPayout) {
      const { data: existingLaborExpense } = await supabase
        .from('expenses')
        .select('id')
        .eq('job_id', job.id)
        .eq('category', 'Labor')
        .maybeSingle();

      if (!existingLaborExpense) {
        const laborDescription = `Labor cost from Quote ${formattedQuoteNum}${
          laborSummaries.length > 0 ? `: ${laborSummaries.join(', ')}` : ''
        }`;

        const { data: laborRecord } = await supabase
          .from('expenses')
          .insert([
            {
              expense_date: expenseDate,
              category: 'Labor',
              amount: totalLaborCost,
              vendor: 'Internal Crew',
              description: laborDescription,
              job_id: job.id,
              organization_id: organizationId,
            },
          ])
          .select('id')
          .single();

        if (laborRecord?.id) {
          await enqueueXeroExpenseBill({
            organizationId,
            expenseId: laborRecord.id,
            vendorName: 'Internal Crew',
            expenseDate,
            reference: `Quote Labor - ${formattedQuoteNum}`,
            description: laborDescription,
            amount: totalLaborCost,
          });
        }
      }
    }

    // 2. Log Materials & Supplies cost
    if (totalMaterialCost > 0) {
      const { data: existingMaterialExpense } = await supabase
        .from('expenses')
        .select('id')
        .eq('job_id', job.id)
        .eq('category', 'Materials & Supplies')
        .maybeSingle();

      if (!existingMaterialExpense) {
        const materialDescription = `Materials cost from Quote ${formattedQuoteNum}${
          materialSummaries.length > 0 ? `: ${materialSummaries.join(', ')}` : ''
        }`;

        const { data: materialRecord } = await supabase
          .from('expenses')
          .insert([
            {
              expense_date: expenseDate,
              category: 'Materials & Supplies',
              amount: totalMaterialCost,
              vendor: 'Materials & Supplies',
              description: materialDescription,
              job_id: job.id,
              organization_id: organizationId,
            },
          ])
          .select('id')
          .single();

        if (materialRecord?.id) {
          await enqueueXeroExpenseBill({
            organizationId,
            expenseId: materialRecord.id,
            vendorName: 'Materials & Supplies',
            expenseDate,
            reference: `Quote Materials - ${formattedQuoteNum}`,
            description: materialDescription,
            amount: totalMaterialCost,
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to log automated quote labor/material expenses:', err);
  }
}

