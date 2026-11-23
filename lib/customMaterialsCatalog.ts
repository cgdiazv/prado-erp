import type { SupabaseClient } from '@supabase/supabase-js';

export interface CatalogMaterialItem {
  id: string;
  name: string;
  description: string;
  unitCost: number;
  markupPercent: number;
  archived?: boolean;
}

const AUDIT_ACTION_MATERIALS_CATALOG = 'org_custom_materials_catalog';

export const TRADE_DEFAULT_MATERIALS: Record<
  string,
  Array<Omit<CatalogMaterialItem, 'id' | 'archived'>>
> = {
  'Lawn Care & Landscaping': [
    {
      name: 'Double-Shredded Hardwood Mulch (per cu. yd.)',
      description:
        'Aged dark brown double-shredded hardwood bark mulch for moisture retention and weed suppression in landscape beds.',
      unitCost: 38.0,
      markupPercent: 30.0,
    },
    {
      name: 'Slow-Release Granular Turf Fertilizer (50 lb Bag)',
      description:
        'Professional 24-0-11 slow-release nitrogen and iron granular fertilizer blend covering up to 12,000 sq ft of turf.',
      unitCost: 42.0,
      markupPercent: 30.0,
    },
    {
      name: 'Turf-Type Tall Fescue / Ryegrass Seed Blend (50 lb Bag)',
      description:
        'Certified weed-free drought-tolerant turfgrass seed blend for core aeration and seasonal overseeding.',
      unitCost: 95.0,
      markupPercent: 30.0,
    },
    {
      name: 'Pop-Up 4" Gear-Drive Rotor Sprinkler Head',
      description:
        'Commercial 4-inch pop-up adjustable arc gear-drive rotor head with filter screen and nozzle tree.',
      unitCost: 18.5,
      markupPercent: 35.0,
    },
    {
      name: 'Selective Broadleaf & Pre-Emergent Herbicide Concentrate',
      description:
        'Pre- and post-emergent turf herbicide application per treated half-acre for crabgrass and broadleaf weed control.',
      unitCost: 32.0,
      markupPercent: 30.0,
    },
    {
      name: 'Commercial Landscape Fabric & Steel Staples Kit',
      description:
        'Heavy-duty 5 oz woven geotextile weed barrier roll section with 11-gauge galvanized sod staples.',
      unitCost: 48.0,
      markupPercent: 30.0,
    },
  ],
  'HVAC & Refrigeration': [
    {
      name: 'MERV 13 Pleated Commercial Air Filters (Case of 4)',
      description:
        'High-efficiency MERV 13 pleated HVAC return air filters for rooftop units and commercial air handlers.',
      unitCost: 54.0,
      markupPercent: 35.0,
    },
    {
      name: 'R-410A / R-454B Refrigerant Charge (per lb)',
      description:
        'Virgin EPA-certified refrigerant charge including locking refrigerant cap and Schrader valve core seal.',
      unitCost: 45.0,
      markupPercent: 40.0,
    },
    {
      name: 'Dual-Run Oval Capacitor (45/5 µF 440V)',
      description:
        'OEM-grade 370/440 VAC aluminum dual-run motor capacitor for condenser compressor and fan motor circuits.',
      unitCost: 24.0,
      markupPercent: 45.0,
    },
    {
      name: '2-Pole 40A 24V Definite Purpose Contactor',
      description:
        'Heavy-duty 40-amp 2-pole magnetic contactor with 24V coil and enclosed silver-alloy contacts.',
      unitCost: 28.0,
      markupPercent: 40.0,
    },
    {
      name: 'Programmable Wi-Fi Smart Commercial Thermostat',
      description:
        'Multi-stage 2H/2C Wi-Fi touchscreen thermostat with auto-changeover, remote sensor support, and wall plate.',
      unitCost: 145.0,
      markupPercent: 30.0,
    },
    {
      name: 'Foaming Condenser Coil Cleaner & Condensate Pan Tablets',
      description:
        'Non-acid alkaline foaming coil detergent and slow-release condensate pan biocide treatment pack.',
      unitCost: 26.0,
      markupPercent: 35.0,
    },
  ],
  'Plumbing & Drain': [
    {
      name: '1/4-Turn Brass Angle Stop & Braided Stainless Supply Line Kit',
      description:
        'Lead-free chrome-plated solid brass 1/4-turn compression shut-off valve with 20-inch braided stainless supply line.',
      unitCost: 22.0,
      markupPercent: 35.0,
    },
    {
      name: 'Commercial Flushometer Rebuild & Diaphragm Kit',
      description:
        'Dual-filtered diaphragm assembly, vacuum breaker sleeve, handle repair kit, and tailpiece O-ring for commercial toilets.',
      unitCost: 44.0,
      markupPercent: 35.0,
    },
    {
      name: '3/4" Brass Pressure Reducing Valve (PRV) Assembly',
      description:
        'Lead-free bronze water pressure reducing valve (25–75 PSI adjustable) with integral stainless strainer and union end.',
      unitCost: 118.0,
      markupPercent: 30.0,
    },
    {
      name: 'Tankless Water Heater Isolation Valve & Descaling Kit',
      description:
        '3/4-inch full-port hot and cold forged brass service valve set with pressure relief valve and food-grade descaler.',
      unitCost: 85.0,
      markupPercent: 30.0,
    },
    {
      name: 'Schedule 40 PVC P-Trap, Cleanout & Solvent Cement Kit',
      description:
        'Heavy-duty 1-1/2" or 2" PVC tubular trap assembly, threaded cleanout plug, primer, and medium-body PVC cement.',
      unitCost: 25.0,
      markupPercent: 35.0,
    },
    {
      name: 'Water Heater Sacrificial Magnesium Anode Rod & T&P Valve',
      description:
        '44-inch hex-head magnesium corrosion protection anode rod paired with CSA-certified 150 PSI temperature & pressure relief valve.',
      unitCost: 58.0,
      markupPercent: 30.0,
    },
  ],
  'Cleaning & Janitorial': [
    {
      name: 'EPA Hospital-Grade Disinfectant & Sanitizer Concentrate (Gallon)',
      description:
        'Broad-spectrum quaternary ammonium Virucidal/Bactericidal disinfectant concentrate for high-touch commercial surfaces.',
      unitCost: 34.0,
      markupPercent: 30.0,
    },
    {
      name: 'High-Solids Acrylic Commercial Floor Sealer & Wax (5 Gallon)',
      description:
        '25% high-solids slip-resistant acrylic floor finish designed for high-speed propane or electric burnishing on VCT and tile.',
      unitCost: 115.0,
      markupPercent: 30.0,
    },
    {
      name: 'Enzyme Carpet Extraction Pre-Spray & Defoamer Pack',
      description:
        'Low-residue encapsulating carpet pre-spray enzyme cleaner and silicone emulsion recovery-tank defoamer.',
      unitCost: 46.0,
      markupPercent: 30.0,
    },
    {
      name: 'Commercial Restroom Paper, Soap & Liner Consumables Bundle',
      description:
        'Case pack of multifold hand towels, jumbo bath tissue rolls, foaming antibacterial soap refills, and high-density can liners.',
      unitCost: 78.0,
      markupPercent: 25.0,
    },
    {
      name: 'Deionized Pure-Water Resin Filter Cartridge Fill',
      description:
        'Mixed-bed DI deionization resin charge for spot-free exterior pure-water pole window washing up to 0 TDS.',
      unitCost: 62.0,
      markupPercent: 30.0,
    },
    {
      name: '20" High-Speed Floor Burnishing & Stripping Pads (Case of 5)',
      description:
        'Commercial 20-inch black stripping or hog-hair natural blend ultra-high-speed floor machine burnishing pads.',
      unitCost: 39.0,
      markupPercent: 30.0,
    },
  ],
  'Roofing & Construction': [
    {
      name: 'Architectural Laminated Asphalt Shingles (per Bundle)',
      description:
        'Class A fire-rated, 130-MPH wind-warranted dimensional architectural roof shingles (33.3 sq ft coverage per bundle).',
      unitCost: 44.0,
      markupPercent: 30.0,
    },
    {
      name: 'Self-Adhering Ice & Water Shield Underlayment Roll',
      description:
        'Rubberized asphalt waterproof membrane roll (200 sq ft) for roof valleys, eaves, skylights, and chimney penetrations.',
      unitCost: 92.0,
      markupPercent: 30.0,
    },
    {
      name: 'Lead / Neoprene Plumbing Vent Pipe Boot & Sealant Kit',
      description:
        'Heavy-duty 2"–3" UV-resistant neoprene and aluminum base pipe flashing boot with 3 tubes of polyurethane roof sealant.',
      unitCost: 36.0,
      markupPercent: 35.0,
    },
    {
      name: '6" Seamless K-Style Aluminum Gutter Coil & Hidden Hangers (per 50 ft)',
      description:
        '0.032-gauge baked-enamel aluminum gutter coil section including heavy-duty hidden screw brackets and downspout outlets.',
      unitCost: 135.0,
      markupPercent: 30.0,
    },
    {
      name: 'Commercial Elastomeric Roof & Flashing Coating (5 Gallon)',
      description:
        '100% acrylic high-reflectivity elastomeric waterproof roof membrane coating with polyester reinforcing fabric roll.',
      unitCost: 148.0,
      markupPercent: 30.0,
    },
    {
      name: 'Reinforced Heavy-Duty Storm Tarp (30x40 ft) & Furring Strips',
      description:
        '12-mil woven polyethylene rip-stop waterproof emergency roof tarp with 1x2 wood battens and cap nails.',
      unitCost: 88.0,
      markupPercent: 30.0,
    },
  ],
  'Other / General Maintenance': [
    {
      name: 'Commercial Grade 1 Hydraulic Door Closer Assembly',
      description:
        'ANSI Grade 1 cast-aluminum adjustable spring size 1–6 hydraulic door closer with parallel-arm bracket and thru-bolts.',
      unitCost: 84.0,
      markupPercent: 30.0,
    },
    {
      name: '4-Foot Direct-Wire Ballast-Bypass LED Tubes (Case of 10)',
      description:
        '18W 5000K daylight Type-B ballast-bypass T8 LED glass tubes with non-shunted tombstones for commercial troffers.',
      unitCost: 68.0,
      markupPercent: 30.0,
    },
    {
      name: 'Drywall Patch Board, Setting Compound & Primer Kit',
      description:
        '5/8" fire-rated gypsum board section, 20-minute hot mud, fiberglass mesh tape, texture spray, and stain-blocking primer.',
      unitCost: 38.0,
      markupPercent: 35.0,
    },
    {
      name: 'Heavy-Duty Gate Latch, Drop Rod & Hinge Hardware Kit',
      description:
        'Powder-coated steel lockable gravity gate latch, adjustable barrel hinges, and EPDM perimeter weatherstripping.',
      unitCost: 52.0,
      markupPercent: 30.0,
    },
    {
      name: 'Hydraulic Jack Oil, Cylinder Seal & Degreaser Service Pack',
      description:
        'ISO VG 32 anti-wear hydraulic fluid (2.5 gal), high-pressure O-ring/wiper seal kit, and biodegradable dock degreaser.',
      unitCost: 64.0,
      markupPercent: 30.0,
    },
    {
      name: 'Concrete & Masonry Anchors, Fasteners & Sealant Assortment',
      description:
        '3/8" stainless wedge anchors, Tapcon masonry screws, structural washers, and commercial-grade silicone/polyurethane caulk.',
      unitCost: 29.0,
      markupPercent: 35.0,
    },
  ],
};

function sanitizeMaterialsCatalog(raw: unknown): CatalogMaterialItem[] {
  if (!Array.isArray(raw)) return [];
  const results: CatalogMaterialItem[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : '';
    const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : '';
    if (!id || !name) continue;

    const description = typeof record.description === 'string' ? record.description.trim() : '';
    const unitCost = Number(record.unitCost ?? 0);
    const markupPercent = Number(record.markupPercent ?? 30);
    const archived = Boolean(record.archived);

    results.push({
      id,
      name,
      description,
      unitCost: Number.isFinite(unitCost) && unitCost >= 0 ? Math.round(unitCost * 100) / 100 : 0,
      markupPercent:
        Number.isFinite(markupPercent) && markupPercent >= 0 && markupPercent <= 500
          ? Math.round(markupPercent * 100) / 100
          : 30,
      archived,
    });
  }

  return results;
}

export async function loadCustomMaterialsCatalog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: SupabaseClient<any>,
  organizationId: string
): Promise<CatalogMaterialItem[]> {
  try {
    const { data: orgRow, error } = await supabaseAdmin
      .from('organizations')
      .select('custom_materials_catalog')
      .eq('id', organizationId)
      .maybeSingle();

    if (!error && orgRow && Array.isArray(orgRow.custom_materials_catalog)) {
      return sanitizeMaterialsCatalog(orgRow.custom_materials_catalog);
    }
  } catch {
    // Fallback to audit_logs if custom_materials_catalog column is not yet migrated
  }

  try {
    const { data: logRow } = await supabaseAdmin
      .from('audit_logs')
      .select('metadata')
      .eq('organization_id', organizationId)
      .eq('action', AUDIT_ACTION_MATERIALS_CATALOG)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const items = (logRow?.metadata as Record<string, unknown> | null)?.items;
    return sanitizeMaterialsCatalog(items);
  } catch {
    return [];
  }
}

export async function saveCustomMaterialsCatalog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: SupabaseClient<any>,
  organizationId: string,
  userId: string,
  items: CatalogMaterialItem[]
): Promise<{ success: boolean; items: CatalogMaterialItem[]; error?: string }> {
  const sanitized = sanitizeMaterialsCatalog(items);

  const { error: updateErr } = await supabaseAdmin
    .from('organizations')
    .update({ custom_materials_catalog: sanitized })
    .eq('id', organizationId);

  if (!updateErr) {
    return { success: true, items: sanitized };
  }

  const isMissingColumn =
    updateErr.code === '42703' ||
    updateErr.message?.includes('custom_materials_catalog') ||
    updateErr.message?.includes('schema cache');

  if (!isMissingColumn) {
    return { success: false, items: sanitized, error: updateErr.message };
  }

  await supabaseAdmin
    .from('audit_logs')
    .delete()
    .eq('organization_id', organizationId)
    .eq('action', AUDIT_ACTION_MATERIALS_CATALOG);

  const { error: logErr } = await supabaseAdmin.from('audit_logs').insert([
    {
      organization_id: organizationId,
      actor_user_id: userId,
      action: AUDIT_ACTION_MATERIALS_CATALOG,
      entity_type: 'organization',
      entity_id: organizationId,
      metadata: { items: sanitized },
    },
  ]);

  if (logErr) {
    return { success: false, items: sanitized, error: logErr.message };
  }

  return { success: true, items: sanitized };
}

export async function seedDefaultMaterialsForOrganization(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: SupabaseClient<any>,
  organizationId: string,
  userId: string,
  tradeVertical?: string,
  defaultMarkupPercent = 30
): Promise<CatalogMaterialItem[]> {
  const existing = await loadCustomMaterialsCatalog(supabaseAdmin, organizationId);
  const existingNames = new Set(existing.map((item) => item.name.trim().toLowerCase()));

  const presets =
    TRADE_DEFAULT_MATERIALS[tradeVertical || ''] ||
    TRADE_DEFAULT_MATERIALS['Other / General Maintenance'];

  const fallbackMarkup =
    Number.isFinite(defaultMarkupPercent) && defaultMarkupPercent >= 0
      ? Math.round(defaultMarkupPercent * 100) / 100
      : 30;

  const newItems: CatalogMaterialItem[] = presets
    .filter((preset) => !existingNames.has(preset.name.trim().toLowerCase()))
    .map((preset, idx) => ({
      id: `mat_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      name: preset.name,
      description: preset.description,
      unitCost: preset.unitCost,
      markupPercent: fallbackMarkup,
      archived: false,
    }));

  if (newItems.length === 0) {
    return existing;
  }

  const combined = [...existing, ...newItems];
  const saved = await saveCustomMaterialsCatalog(supabaseAdmin, organizationId, userId, combined);
  return saved.items;
}
