import { SupabaseClient } from '@supabase/supabase-js';

export interface SampleJobDefinition {
  jobType: string;
  costAmount: number;
  notes: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  daysOffset: number; // Offset in days from today (e.g. 0 = today, 1 = tomorrow, -1 = yesterday)
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
    jobs: [
      {
        jobType: 'Bi-Weekly Lawn Mowing, Edging & Blowout',
        costAmount: 120.00,
        notes: 'Front and backyard mowing. Edge along curb, driveway, and garden beds. Blow off all walkways.',
        status: 'scheduled',
        daysOffset: 0,
      },
      {
        jobType: 'Spring Turf Aeration & Premium Fertilization',
        costAmount: 350.00,
        notes: 'Core aeration for 0.5 acre turf. Apply organic slow-release spring fertilizer blend.',
        status: 'in_progress',
        daysOffset: 1,
      },
      {
        jobType: 'Shrub Trimming & Flowerbed Mulch Refresh',
        costAmount: 275.00,
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
    jobs: [
      {
        jobType: 'R-410A Refrigerant Leak Check & Coil Clean',
        costAmount: 450.00,
        notes: 'Inspect rooftop RTU-2 condenser coils. Nitrogen pressure check and recharge R-410A.',
        status: 'scheduled',
        daysOffset: 0,
      },
      {
        jobType: 'Dual Compressor Seasonal Tune-Up & Filter Swap',
        costAmount: 280.00,
        notes: 'Replace MERV 13 commercial air filters. Test contactors, capacitors, and belt tension.',
        status: 'in_progress',
        daysOffset: 1,
      },
      {
        jobType: 'Emergency Ductwork & Smart Thermostat Replacement',
        costAmount: 890.00,
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
    jobs: [
      {
        jobType: 'Commercial Hydro-Jetting & Sewer Camera Line Inspection',
        costAmount: 650.00,
        notes: 'High-pressure hydro-jet main kitchen grease line. Video inspection to main city sewer hookup.',
        status: 'scheduled',
        daysOffset: 0,
      },
      {
        jobType: 'Tankless Water Heater Installation & Pressure Test',
        costAmount: 1250.00,
        notes: 'Mount Rinnai Sensei commercial tankless unit. Run 3/4" gas supply and pressure test lines.',
        status: 'in_progress',
        daysOffset: 2,
      },
      {
        jobType: 'Restroom Fixture Replacement & Backflow Valve Service',
        costAmount: 320.00,
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
    jobs: [
      {
        jobType: 'Nightly Commercial Floor Buffing & High-Touch Sanitization',
        costAmount: 210.00,
        notes: 'High-speed buffer on VCT lobby tile. Sanitize door handles, elevator buttons, and conference tables.',
        status: 'scheduled',
        daysOffset: 0,
      },
      {
        jobType: 'Post-Construction Deep Cleaning & Exterior Window Washing',
        costAmount: 780.00,
        notes: 'Vacuum drywall dust from 3rd floor suite. Exterior glass wash on levels 1-3 with pure water pole.',
        status: 'in_progress',
        daysOffset: 1,
      },
      {
        jobType: 'Carpet Steam Extraction & Executive Suite High-Dusting',
        costAmount: 430.00,
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
    jobs: [
      {
        jobType: 'Architectural Shingle Roof Repair & Flashing Replacement',
        costAmount: 1850.00,
        notes: 'Replace damaged GAF Timberline shingles over north slope. Install custom lead pipe boots and chimney flashing.',
        status: 'scheduled',
        daysOffset: 0,
      },
      {
        jobType: 'Seamless Gutter System Installation & Leaf Guard Fit',
        costAmount: 950.00,
        notes: 'Extrude 180 ft of 6-inch aluminum seamless gutters. Install micro-mesh gutter guards and downspouts.',
        status: 'in_progress',
        daysOffset: 2,
      },
      {
        jobType: 'Post-Storm Roof Assessment & Emergency Tarping',
        costAmount: 500.00,
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
    jobs: [
      {
        jobType: 'Quarterly Facility PM & Security Gate Latch Repair',
        costAmount: 320.00,
        notes: 'Inspect emergency exit hardware and fire extinguishers. Re-align keypad gate arm and grease hinges.',
        status: 'scheduled',
        daysOffset: 0,
      },
      {
        jobType: 'High-Bay LED Light Conversion & Electrical Safety Check',
        costAmount: 490.00,
        notes: 'Bypass ballasts and install 12 high-efficiency 150W LED UFO high-bay fixtures in warehouse bay B.',
        status: 'in_progress',
        daysOffset: 1,
      },
      {
        jobType: 'Hydraulic Freight Lift Maintenance & Exterior Touch-Up',
        costAmount: 620.00,
        notes: 'Check hydraulic fluid level and replace seals on cargo lift. Pressure wash loading dock bay.',
        status: 'completed',
        daysOffset: -3,
      },
    ],
  },
};

/**
 * Helper to seed sample customers, properties, vehicles, and trade-specific jobs into Supabase
 */
export async function seedTradeSampleData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: SupabaseClient<any>,
  organizationId: string,
  tradeVertical?: string
) {
  try {
    const config = TRADE_SAMPLE_DATA[tradeVertical || ''] || TRADE_SAMPLE_DATA['Other / General Maintenance'];

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
