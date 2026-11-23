import { SupabaseClient } from '@supabase/supabase-js';

export interface SampleJobDefinition {
  jobType: string;
  costAmount: number;
  notes: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  daysOffset: number; // Offset in days from today (e.g. 0 = today, 1 = tomorrow, -1 = yesterday)
}

export interface SampleServiceDefinition {
  name: string;
  description: string;
  basePrice: number;
  isRecurringDefault?: boolean;
  recurrenceIntervalDays?: number | null;
}

export interface TradeConfig {
  label: string;
  customer: {
    firstName: string;
    lastName: string;
    companyName: string;
    email: string;
    phone: string;
    address: string;
  };
  vehicleName: string;
  services: SampleServiceDefinition[];
  jobs: SampleJobDefinition[];
}

export const TRADE_SAMPLE_DATA: Record<string, TradeConfig> = {
  'Lawn Care & Landscaping': {
    label: 'Lawn Care & Landscaping',
    customer: {
      firstName: 'Apex',
      lastName: 'Commercial Properties',
      companyName: 'Apex Commercial Properties',
      email: 'service@apexproperties.com',
      phone: '(555) 234-5678',
      address: '1042 Evergreen Terrace, Austin, TX 78704',
    },
    vehicleName: 'Field Crew #1 (Lawn Maintenance)',
    services: [
      {
        name: 'Bi-Weekly Lawn Mowing, Edging & Blowout',
        description:
          'Complete turf mowing at optimal seasonal height, precision string trimming around obstacles, vertical blade edging along curbs, driveways, and walkways, and hard-surface debris blowout.',
        basePrice: 120.0,
        isRecurringDefault: true,
        recurrenceIntervalDays: 14,
      },
      {
        name: 'Spring Turf Aeration & Premium Fertilization',
        description:
          'Mechanical core plug aeration across all turf zones to relieve soil compaction and improve root oxygen flow, followed by slow-release organic-blend spring fertilizer application.',
        basePrice: 350.0,
      },
      {
        name: 'Shrub Trimming & Flowerbed Mulch Refresh',
        description:
          'Hand-weeding and bed border trenching, ornamental shrub and hedge shaping, and installation of up to 3 cubic yards of dark double-shredded hardwood mulch.',
        basePrice: 275.0,
      },
      {
        name: 'Turf Weed Control & Pre-Emergent Treatment',
        description:
          'Targeted liquid post-emergent spot treatment for broadleaf weeds paired with seasonal pre-emergent barrier application to prevent crabgrass and annual weed germination.',
        basePrice: 115.0,
        isRecurringDefault: true,
        recurrenceIntervalDays: 45,
      },
      {
        name: 'Irrigation System Inspection & Zone Tune-Up',
        description:
          'Full controller diagnostic across all sprinkler zones, rotor and spray nozzle alignment, minor clogged head clearing, static pressure check, and seasonal run-time programming.',
        basePrice: 155.0,
      },
      {
        name: 'Seasonal Leaf Clean-Up & Green Waste Haul-Away',
        description:
          'Complete removal of fallen leaves, branches, and winter/autumn debris from turf and landscape beds, perimeter blow-out, and off-site green-waste disposal.',
        basePrice: 325.0,
      },
    ],
    jobs: [
      {
        jobType: 'Bi-Weekly Lawn Mowing, Edging & Blowout',
        costAmount: 120.0,
        notes: 'Front and backyard mowing. Edge along curb, driveway, and garden beds. Blow off all walkways.',
        status: 'scheduled',
        daysOffset: 0,
      },
      {
        jobType: 'Spring Turf Aeration & Premium Fertilization',
        costAmount: 350.0,
        notes: 'Core aeration for 0.5 acre turf. Apply organic slow-release spring fertilizer blend.',
        status: 'in_progress',
        daysOffset: 1,
      },
      {
        jobType: 'Shrub Trimming & Flowerbed Mulch Refresh',
        costAmount: 275.0,
        notes: 'Trim front hedge and ornamental trees. Spread 3 cu. yds of dark brown hardwood mulch.',
        status: 'completed',
        daysOffset: -2,
      },
    ],
  },
  'HVAC & Refrigeration': {
    label: 'HVAC & Refrigeration',
    customer: {
      firstName: 'Metro',
      lastName: 'Retail Center',
      companyName: 'Metro Retail Center',
      email: 'facilities@metroretail.com',
      phone: '(555) 345-6789',
      address: '4500 Commerce Blvd, Suite 100, Austin, TX 78745',
    },
    vehicleName: 'Tech Van 1 (HVAC Service)',
    services: [
      {
        name: 'HVAC System Diagnostic & Troubleshooting',
        description:
          'Comprehensive electrical and mechanical evaluation of heating or cooling system, static airflow and superheat/subcooling check, and upfront flat-rate repair recommendations.',
        basePrice: 129.0,
      },
      {
        name: 'Dual Compressor Seasonal Tune-Up & Filter Swap',
        description:
          '21-point preventive maintenance inspection including MERV 13 filter replacement, contactor and capacitor amperage testing, belt tension check, and condensate drain clearing.',
        basePrice: 280.0,
        isRecurringDefault: true,
        recurrenceIntervalDays: 180,
      },
      {
        name: 'R-410A Refrigerant Leak Check & Coil Clean',
        description:
          'Electronic and nitrogen pressure leak test of condenser and evaporator coils, chemical condenser coil wash, schrader core verification, and refrigerant charge balancing.',
        basePrice: 450.0,
      },
      {
        name: 'Dual-Run Capacitor & Contactor Replacement',
        description:
          'Supply and installation of OEM-grade dual-run capacitor and heavy-duty 2-pole contactor, electrical lug tightening, and compressor startup current verification.',
        basePrice: 265.0,
      },
      {
        name: 'Emergency Ductwork & Smart Thermostat Replacement',
        description:
          'Re-sealing of supply/return flex duct connection with mastic and UL-181 tape, plus installation, C-wire setup, and calibration of programmable Wi-Fi smart thermostat.',
        basePrice: 890.0,
      },
      {
        name: 'Blower Motor & Wheel Assembly Service',
        description:
          'Replacement of indoor air-handler blower motor, squirrel-cage wheel cleaning and balancing, static pressure check, and high-limit safety switch testing.',
        basePrice: 575.0,
      },
    ],
    jobs: [
      {
        jobType: 'R-410A Refrigerant Leak Check & Coil Clean',
        costAmount: 450.0,
        notes: 'Inspect rooftop RTU-2 condenser coils. Nitrogen pressure check and recharge R-410A.',
        status: 'scheduled',
        daysOffset: 0,
      },
      {
        jobType: 'Dual Compressor Seasonal Tune-Up & Filter Swap',
        costAmount: 280.0,
        notes: 'Replace MERV 13 commercial air filters. Test contactors, capacitors, and belt tension.',
        status: 'in_progress',
        daysOffset: 1,
      },
      {
        jobType: 'Emergency Ductwork & Smart Thermostat Replacement',
        costAmount: 890.0,
        notes: 'Re-seal flex duct connection in suite B. Install and calibrate Honeywell T6 Pro WiFi thermostat.',
        status: 'completed',
        daysOffset: -3,
      },
    ],
  },
  'Plumbing & Drain': {
    label: 'Plumbing & Drain',
    customer: {
      firstName: 'Highland',
      lastName: 'Restaurant Group',
      companyName: 'Highland Restaurant Group',
      email: 'ops@highlanddining.com',
      phone: '(555) 456-7890',
      address: '812 Congress Ave, Austin, TX 78701',
    },
    vehicleName: 'Drain Jetting Rig #1',
    services: [
      {
        name: 'Plumbing Leak & Pressure Diagnostic Inspection',
        description:
          'On-site inspection of water supply piping, angle stops, drain traps, and incoming water pressure regulator (PSI test), including itemized flat-rate repair options.',
        basePrice: 115.0,
      },
      {
        name: 'Commercial Hydro-Jetting & Sewer Camera Line Inspection',
        description:
          'High-pressure 3,500+ PSI hydro-jetting to clear grease, scale, and root intrusion from main sanitary drain line, paired with HD color sewer camera inspection to city tap.',
        basePrice: 650.0,
      },
      {
        name: 'Tankless Water Heater Installation & Pressure Test',
        description:
          'Mounting of high-efficiency commercial/residential tankless water heater, 3/4-inch gas line connection, isolation service valves, condensate neutralizer, and pressure testing.',
        basePrice: 1250.0,
      },
      {
        name: 'Restroom Fixture Replacement & Backflow Valve Service',
        description:
          'Replacement of commercial flushometer or toilet/faucet fixture assembly, supply line renewal, and certified annual backflow preventer pressure test.',
        basePrice: 320.0,
      },
      {
        name: 'Main Line Auger & Branch Drain Clearing',
        description:
          'Heavy-duty cable auger snaking of clogged kitchen, restroom, or main sewer cleanout up to 100 ft, followed by high-volume flow testing.',
        basePrice: 265.0,
      },
      {
        name: 'Annual Water Heater Flush & Anode Rod Inspection',
        description:
          'Full sediment flush of tank or closed-loop vinegar descaling of tankless heat exchanger, T&P relief valve safety check, and anode rod inspection.',
        basePrice: 225.0,
        isRecurringDefault: true,
        recurrenceIntervalDays: 365,
      },
    ],
    jobs: [
      {
        jobType: 'Commercial Hydro-Jetting & Sewer Camera Line Inspection',
        costAmount: 650.0,
        notes: 'High-pressure hydro-jet main kitchen grease line. Video inspection to main city sewer hookup.',
        status: 'scheduled',
        daysOffset: 0,
      },
      {
        jobType: 'Tankless Water Heater Installation & Pressure Test',
        costAmount: 1250.0,
        notes: 'Mount Rinnai Sensei commercial tankless unit. Run 3/4" gas supply and pressure test lines.',
        status: 'in_progress',
        daysOffset: 2,
      },
      {
        jobType: 'Restroom Fixture Replacement & Backflow Valve Service',
        costAmount: 320.0,
        notes: 'Replace Sloan flushometer valve on 2 commercial toilets. Annual certified backflow prevention test.',
        status: 'completed',
        daysOffset: -1,
      },
    ],
  },
  'Cleaning & Janitorial': {
    label: 'Cleaning & Janitorial',
    customer: {
      firstName: 'Plaza',
      lastName: 'Office Complex',
      companyName: 'Plaza Office Complex',
      email: 'management@plazaoffice.com',
      phone: '(555) 567-8901',
      address: '2200 Barton Springs Rd, Austin, TX 78704',
    },
    vehicleName: 'Sanitation Van 1',
    services: [
      {
        name: 'Nightly Commercial Floor Buffing & High-Touch Sanitization',
        description:
          'High-speed burnishing of VCT/hard lobby floors, HEPA vacuuming, restroom sanitization, trash removal, and EPA-registered disinfection of door handles, elevators, and desks.',
        basePrice: 210.0,
        isRecurringDefault: true,
        recurrenceIntervalDays: 7,
      },
      {
        name: 'Post-Construction Deep Cleaning & Exterior Window Washing',
        description:
          'Fine drywall dust extraction from all surfaces, vents, baseboards, and window tracks, paint/adhesive removal, plus pure-water exterior glass washing up to 3 stories.',
        basePrice: 780.0,
      },
      {
        name: 'Carpet Steam Extraction & Executive Suite High-Dusting',
        description:
          'Enzyme pre-spray of traffic lanes and stains followed by commercial hot-water carpet extraction up to 4,000 sq ft, plus high-dusting of HVAC diffusers and overhead fixtures.',
        basePrice: 430.0,
      },
      {
        name: 'Move-In / Move-Out Full Property Detail Cleaning',
        description:
          'Comprehensive deep cleaning of empty suite or residence including interior cabinets, appliances, baseboards, blinds, light fixtures, and full restroom descaling.',
        basePrice: 395.0,
      },
      {
        name: 'Hard Floor Strip, Seal & 4-Coat Commercial Wax',
        description:
          'Machine stripping of old acrylic finish, pH-neutral rinse, application of 4 coats of high-solids commercial floor finish, and high-speed buffing.',
        basePrice: 520.0,
      },
      {
        name: 'Interior & Exterior Glass & Storefront Window Cleaning',
        description:
          'Streak-free squeegee and deionized pure-water cleaning of interior and exterior windows, mullion wipe-down, and entry door glass polishing.',
        basePrice: 245.0,
      },
    ],
    jobs: [
      {
        jobType: 'Nightly Commercial Floor Buffing & High-Touch Sanitization',
        costAmount: 210.0,
        notes: 'High-speed buffer on VCT lobby tile. Sanitize door handles, elevator buttons, and conference tables.',
        status: 'scheduled',
        daysOffset: 0,
      },
      {
        jobType: 'Post-Construction Deep Cleaning & Exterior Window Washing',
        costAmount: 780.0,
        notes: 'Vacuum drywall dust from 3rd floor suite. Exterior glass wash on levels 1-3 with pure water pole.',
        status: 'in_progress',
        daysOffset: 1,
      },
      {
        jobType: 'Carpet Steam Extraction & Executive Suite High-Dusting',
        costAmount: 430.0,
        notes: 'Hot-water extraction on 4,000 sq ft office carpeting. Clean HVAC return diffusers and light fixtures.',
        status: 'completed',
        daysOffset: -2,
      },
    ],
  },
  'Roofing & Construction': {
    label: 'Roofing & Construction',
    customer: {
      firstName: 'Crestview',
      lastName: 'Homeowners Association',
      companyName: 'Crestview HOA',
      email: 'board@crestviewhoa.org',
      phone: '(555) 678-9012',
      address: '6700 Woodrow Ave, Austin, TX 78757',
    },
    vehicleName: 'Construction Rig #1',
    services: [
      {
        name: 'Post-Storm Roof Assessment & Emergency Tarping',
        description:
          'Drone and physical inspection of storm or hail damage across slopes and penetrations, plus secure installation of reinforced waterproof tarping over active leak zones.',
        basePrice: 500.0,
      },
      {
        name: 'Architectural Shingle Roof Repair & Flashing Replacement',
        description:
          'Removal of damaged shingles and underlayment, installation of matching architectural shingles, ice-and-water shield, custom lead/neoprene pipe boots, and chimney counter-flashing.',
        basePrice: 1850.0,
      },
      {
        name: 'Seamless Gutter System Installation & Leaf Guard Fit',
        description:
          'On-site extrusion of 6-inch seamless aluminum K-style gutters with hidden screw hangers, mitered corners, downspouts, and micro-mesh leaf guard protection.',
        basePrice: 950.0,
      },
      {
        name: 'Comprehensive Roof Inspection & Drone Photo Report',
        description:
          '40-point roof envelope, valley, ridge vent, and attic moisture evaluation with high-resolution annotated drone photos for preventive planning or insurance claims.',
        basePrice: 195.0,
      },
      {
        name: 'Flat Roof TPO / Elastomeric Seam & Drain Maintenance',
        description:
          'Clearing of roof drains and scuppers, cleaning of membrane seams, and application of commercial elastomeric coating around HVAC curbs and parapet flashings.',
        basePrice: 680.0,
        isRecurringDefault: true,
        recurrenceIntervalDays: 180,
      },
      {
        name: 'Skylight & Valley Flashing Waterproofing Rebuild',
        description:
          'Removal of perimeter shingles around skylight or roof valley, installation of self-adhering waterproof membrane, new pre-painted metal flashing kit, and shingle tie-in.',
        basePrice: 740.0,
      },
    ],
    jobs: [
      {
        jobType: 'Architectural Shingle Roof Repair & Flashing Replacement',
        costAmount: 1850.0,
        notes: 'Replace damaged GAF Timberline shingles over north slope. Install custom lead pipe boots and chimney flashing.',
        status: 'scheduled',
        daysOffset: 0,
      },
      {
        jobType: 'Seamless Gutter System Installation & Leaf Guard Fit',
        costAmount: 950.0,
        notes: 'Extrude 180 ft of 6-inch aluminum seamless gutters. Install micro-mesh gutter guards and downspouts.',
        status: 'in_progress',
        daysOffset: 2,
      },
      {
        jobType: 'Post-Storm Roof Assessment & Emergency Tarping',
        costAmount: 500.0,
        notes: 'Drone photo inspection of hail damage across 4 units. Install 30x40 reinforced blue tarp over leak zone.',
        status: 'completed',
        daysOffset: -4,
      },
    ],
  },
  'Other / General Maintenance': {
    label: 'Other / General Maintenance',
    customer: {
      firstName: 'Industrial Park',
      lastName: 'Storage Solutions',
      companyName: 'Industrial Park Storage',
      email: 'ops@industrialparkstorage.com',
      phone: '(555) 789-0123',
      address: '1100 E 5th St, Austin, TX 78702',
    },
    vehicleName: 'General Service Truck #1',
    services: [
      {
        name: 'Standard Service Call & Facility Diagnostic',
        description:
          'On-site technician dispatch, equipment and safety inspection, minor hardware adjustment, and itemized scope estimate for any required replacement parts.',
        basePrice: 125.0,
      },
      {
        name: 'Quarterly Facility PM & Security Gate Latch Repair',
        description:
          'Scheduled preventive inspection of emergency exit hardware, fire extinguishers, entry doors, and perimeter security gates including hinge lubrication and latch alignment.',
        basePrice: 320.0,
        isRecurringDefault: true,
        recurrenceIntervalDays: 90,
      },
      {
        name: 'High-Bay LED Light Conversion & Electrical Safety Check',
        description:
          'Ballast bypass and retrofit installation of high-efficiency commercial LED fixtures, wiring and breaker load check, and recycling/disposal of legacy lamps.',
        basePrice: 490.0,
      },
      {
        name: 'Hydraulic Freight Lift Maintenance & Exterior Touch-Up',
        description:
          'Inspection of hydraulic fluid levels, hoses, and cylinder seals on dock/freight lift, safety sensor check, plus pressure washing of loading dock bay.',
        basePrice: 620.0,
      },
      {
        name: 'Commercial Door Closer, Hinge & Panic Bar Service',
        description:
          'Replacement or hydraulic tension adjustment of commercial door closer, continuous hinge realignment, panic bar latch calibration, and threshold weatherstripping.',
        basePrice: 245.0,
      },
      {
        name: 'Drywall Patch, Texture Match & Interior Touch-Up Paint',
        description:
          'Repair of interior wall or ceiling damage up to 4x4 ft including backing installation, tape and joint compound, texture blending, primer seal, and 2 finish coats.',
        basePrice: 295.0,
      },
    ],
    jobs: [
      {
        jobType: 'Quarterly Facility PM & Security Gate Latch Repair',
        costAmount: 320.0,
        notes: 'Inspect emergency exit hardware and fire extinguishers. Re-align keypad gate arm and grease hinges.',
        status: 'scheduled',
        daysOffset: 0,
      },
      {
        jobType: 'High-Bay LED Light Conversion & Electrical Safety Check',
        costAmount: 490.0,
        notes: 'Bypass ballasts and install 12 high-efficiency 150W LED UFO high-bay fixtures in warehouse bay B.',
        status: 'in_progress',
        daysOffset: 1,
      },
      {
        jobType: 'Hydraulic Freight Lift Maintenance & Exterior Touch-Up',
        costAmount: 620.0,
        notes: 'Check hydraulic fluid level and replace seals on cargo lift. Pressure wash loading dock bay.',
        status: 'completed',
        daysOffset: -3,
      },
    ],
  },
};

export const TRADE_VERTICAL_OPTIONS = Object.keys(TRADE_SAMPLE_DATA);

/**
 * Seeds default trade-specific services (with detailed descriptions & editable base prices)
 * into `public.services` for an organization, skipping any service names that already exist.
 */
export async function seedDefaultServicesForOrganization(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: SupabaseClient<any>,
  organizationId: string,
  tradeVertical?: string
) {
  try {
    const config =
      TRADE_SAMPLE_DATA[tradeVertical || ''] || TRADE_SAMPLE_DATA['Other / General Maintenance'];

    const { data: existingServices } = await supabaseAdmin
      .from('services')
      .select('id, name')
      .eq('organization_id', organizationId);

    const existingNames = new Set(
      (existingServices || []).map((s: { name: string }) =>
        s.name.replace(/^\[\[ARCHIVED\]\]\s*/i, '').trim().toLowerCase()
      )
    );

    const toInsert = config.services
      .filter((svc) => !existingNames.has(svc.name.trim().toLowerCase()))
      .map((svc) => ({
        organization_id: organizationId,
        name: svc.name,
        description: svc.description,
        base_price: svc.basePrice,
        is_recurring_default: Boolean(svc.isRecurringDefault),
        recurrence_interval_days: svc.isRecurringDefault ? (svc.recurrenceIntervalDays ?? 30) : null,
        auto_charge_default: false,
      }));

    if (toInsert.length === 0) {
      return { insertedCount: 0 };
    }

    const { error } = await supabaseAdmin.from('services').insert(toInsert);
    if (error) {
      console.error('Failed to seed default services:', error);
      return { insertedCount: 0, error: error.message };
    }

    return { insertedCount: toInsert.length };
  } catch (err) {
    console.error('Error seeding default services:', err);
    return { insertedCount: 0 };
  }
}

/**
 * Helper to seed sample customers, properties, vehicles, services, and trade-specific jobs into Supabase
 */
export async function seedTradeSampleData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: SupabaseClient<any>,
  organizationId: string,
  tradeVertical?: string
) {
  try {
    const config = TRADE_SAMPLE_DATA[tradeVertical || ''] || TRADE_SAMPLE_DATA['Other / General Maintenance'];

    // 0. Seed default trade-specific services catalog
    await seedDefaultServicesForOrganization(supabaseAdmin, organizationId, tradeVertical);

    // 1. Insert sample customer
    const { data: customer, error: customerErr } = await supabaseAdmin
      .from('customers')
      .insert([
        {
          organization_id: organizationId,
          first_name: config.customer.firstName,
          last_name: config.customer.lastName,
          company_name: config.customer.companyName,
          email: config.customer.email,
          phone: config.customer.phone,
          billing_address: config.customer.address,
        },
      ])
      .select()
      .single();

    if (customerErr || !customer) {
      console.error('Failed to seed sample customer:', customerErr);
      return;
    }

    // 2. Insert sample property linked to customer
    const { data: property, error: propertyErr } = await supabaseAdmin
      .from('properties')
      .insert([
        {
          customer_id: customer.id,
          street_address: config.customer.address,
        },
      ])
      .select()
      .single();

    if (propertyErr || !property) {
      console.error('Failed to seed sample property:', propertyErr);
      return;
    }

    // 3. Insert sample vehicle (truck)
    const { data: vehicle, error: vehicleErr } = await supabaseAdmin
      .from('trucks')
      .insert([
        {
          organization_id: organizationId,
          name: config.vehicleName,
          plate_number: 'TX-PRD01',
          is_active: true,
        },
      ])
      .select()
      .single();

    if (vehicleErr) {
      console.warn('Failed to seed sample vehicle:', vehicleErr);
    }

    const vehicleId = vehicle?.id || null;

    // 4. Insert realistic sample jobs tailored to the trade vertical
    const today = new Date();

    const jobsPayload = config.jobs.map((job) => {
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + job.daysOffset);
      const isoDate = scheduledDate.toISOString().slice(0, 10);

      return {
        property_id: property.id,
        scheduled_date: isoDate,
        job_type: job.jobType,
        cost_amount: job.costAmount,
        notes: job.notes,
        status: job.status,
        truck_id: vehicleId,
      };
    });

    const { error: jobsErr } = await supabaseAdmin.from('jobs').insert(jobsPayload);

    if (jobsErr) {
      console.error('Failed to seed sample jobs:', jobsErr);
    } else {
      console.log(`Successfully seeded ${jobsPayload.length} sample jobs for trade "${config.label}" in org ${organizationId}`);
    }
  } catch (err) {
    console.error('Error during trade sample data seeding:', err);
  }
}
