'use client';

import React from 'react';
import PradoLogo from '@/components/PradoLogo';
import { 
  LayoutDashboard, 
  Calendar, 
  MapPin, 
  Users, 
  FileText, 
  DollarSign, 
  Settings, 
  Bell, 
  Search, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Truck,
  Plus
} from 'lucide-react';

interface BlurredDashboardPreviewProps {
  tradeVertical?: string;
  companyName?: string;
}

export default function BlurredDashboardPreview({
  tradeVertical = 'Lawn Care & Landscaping',
  companyName = 'Prado Field Operations',
}: BlurredDashboardPreviewProps) {
  // Trade-specific preview items
  const getTradePreviewData = () => {
    switch (tradeVertical) {
      case 'HVAC & Refrigeration':
        return {
          jobs: [
            { id: 'JOB-201', title: 'R-410A Refrigerant Leak Check', customer: 'Metro Retail Center', tech: 'Tech Van 1', status: 'Scheduled', time: '09:00 AM', cost: '$450.00' },
            { id: 'JOB-202', title: 'Dual Compressor Tune-Up', customer: 'Barton Plaza', tech: 'Tech Van 2', status: 'In Progress', time: '11:30 AM', cost: '$280.00' },
            { id: 'JOB-203', title: 'Smart Thermostat Installation', customer: 'Highland Park Suite B', tech: 'Tech Van 1', status: 'Completed', time: '02:15 PM', cost: '$390.00' },
          ],
          vehicle: '3 HVAC Tech Vans',
        };
      case 'Plumbing & Drain':
        return {
          jobs: [
            { id: 'JOB-301', title: 'Commercial Hydro-Jetting Service', customer: 'Highland Restaurant Group', tech: 'Drain Jetter #1', status: 'Scheduled', time: '08:30 AM', cost: '$650.00' },
            { id: 'JOB-302', title: 'Tankless Water Heater Installation', customer: 'Oakwood Apartments', tech: 'Plumbing Rig #2', status: 'In Progress', time: '10:45 AM', cost: '$1,250.00' },
            { id: 'JOB-303', title: 'Backflow Valve Annual Testing', customer: 'Congress Commerce Center', tech: 'Plumbing Rig #1', status: 'Completed', time: '01:30 PM', cost: '$320.00' },
          ],
          vehicle: '4 Plumbing Rigs',
        };
      case 'Cleaning & Janitorial':
        return {
          jobs: [
            { id: 'JOB-401', title: 'Nightly Floor Buffing & Sanitization', customer: 'Plaza Office Complex', tech: 'Sanitation Van 1', status: 'Scheduled', time: '07:00 PM', cost: '$210.00' },
            { id: 'JOB-402', title: 'Post-Construction Deep Clean', customer: 'Crestview Medical Center', tech: 'Sanitation Crew #2', status: 'In Progress', time: '11:00 AM', cost: '$780.00' },
            { id: 'JOB-403', title: 'High-Bay Carpet Steam Extraction', customer: 'Capital Tech Hub', tech: 'Sanitation Van 1', status: 'Completed', time: '03:00 PM', cost: '$430.00' },
          ],
          vehicle: '2 Sanitation Vans',
        };
      case 'Roofing & Construction':
        return {
          jobs: [
            { id: 'JOB-501', title: 'Architectural Shingle Repair', customer: 'Crestview HOA', tech: 'Roofing Rig #1', status: 'Scheduled', time: '08:00 AM', cost: '$1,850.00' },
            { id: 'JOB-502', title: 'Seamless Gutter Guard Install', customer: 'Westlake Residence', tech: 'Construction Crew #2', status: 'In Progress', time: '10:15 AM', cost: '$950.00' },
            { id: 'JOB-503', title: 'Storm Damage Assessment & Tarping', customer: 'South Lamar Retail', tech: 'Roofing Rig #1', status: 'Completed', time: '01:00 PM', cost: '$500.00' },
          ],
          vehicle: '5 Construction Rigs',
        };
      default:
        return {
          jobs: [
            { id: 'JOB-101', title: 'Bi-Weekly Lawn Mowing & Edging', customer: 'Apex Commercial Properties', tech: 'Field Crew #1', status: 'Scheduled', time: '08:00 AM', cost: '$120.00' },
            { id: 'JOB-102', title: 'Spring Turf Aeration & Fertilizer', customer: 'Evergreen Office Park', tech: 'Field Crew #2', status: 'In Progress', time: '10:30 AM', cost: '$350.00' },
            { id: 'JOB-103', title: 'Flowerbed Mulch Refresh & Trimming', customer: 'Barton Springs Plaza', tech: 'Field Crew #1', status: 'Completed', time: '01:15 PM', cost: '$275.00' },
          ],
          vehicle: '4 Maintenance Vehicles',
        };
    }
  };

  const tradeData = getTradePreviewData();

  return (
    <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-slate-100 flex flex-col font-sans filter blur-md transform scale-105 opacity-90 transition-all duration-700">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-6">
          <PradoLogo theme="light" iconType="layers" subtitle="Job Operations" />
          <div className="hidden md:flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 w-64 text-slate-400 text-xs">
            <Search className="w-3.5 h-3.5" />
            <span>Search jobs, customers, vehicles...</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg text-slate-400 bg-slate-50 border border-slate-200 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              PR
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900">{companyName}</div>
              <div className="text-[10px] text-emerald-700 font-semibold uppercase">{tradeVertical}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar and Active Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Dashboard Sidebar */}
        <aside className="w-60 bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-2.5 border border-emerald-200/60">
                <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                <span>Dashboard Overview</span>
              </div>
              <div className="px-3 py-2 text-slate-600 font-medium text-xs flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Job Schedule</span>
              </div>
              <div className="px-3 py-2 text-slate-600 font-medium text-xs flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Dispatch Route Map</span>
              </div>
              <div className="px-3 py-2 text-slate-600 font-medium text-xs flex items-center gap-2.5">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Customer CRM</span>
              </div>
              <div className="px-3 py-2 text-slate-600 font-medium text-xs flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-slate-400" />
                <span>Fleet & Vehicles</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Financials</div>
              <div className="px-3 py-2 text-slate-600 font-medium text-xs flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Quotes & Estimates</span>
              </div>
              <div className="px-3 py-2 text-slate-600 font-medium text-xs flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <span>Invoices & Billing</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-slate-400 text-xs px-3">
            <Settings className="w-4 h-4" />
            <span>Workspace Settings</span>
          </div>
        </aside>

        {/* Dashboard Main Workspace Area */}
        <main className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50">
          {/* Header Row */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Today's Dispatch Command Center</h1>
              <p className="text-xs text-slate-500 mt-0.5">Live status feed for {companyName}</p>
            </div>
            <div className="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule New Job</span>
            </div>
          </div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Monthly Revenue</div>
              <div className="text-xl font-black text-slate-900">$18,450.00</div>
              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> +14.2% from last month
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Active Jobs Today</div>
              <div className="text-xl font-black text-slate-900">8 Scheduled</div>
              <div className="text-[10px] text-slate-500 font-medium">3 Completed • 1 In Progress</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">Active Fleet</div>
              <div className="text-xl font-black text-slate-900">{tradeData.vehicle}</div>
              <div className="text-[10px] text-emerald-600 font-bold">100% Route Optimized</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">On-Time Completion</div>
              <div className="text-xl font-black text-emerald-700">98.4%</div>
              <div className="text-[10px] text-slate-500 font-medium">Auto-synced with QBO/Xero</div>
            </div>
          </div>

          {/* Map & Job Table Grid */}
          <div className="grid grid-cols-3 gap-6">
            {/* Jobs Schedule Table */}
            <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">Live Field Jobs Schedule</h3>
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                  {tradeVertical}
                </span>
              </div>

              <div className="overflow-hidden border border-slate-100 rounded-lg">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Job ID & Service</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Assigned Vehicle</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tradeData.jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-semibold text-slate-900">
                          <div>{job.title}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{job.id} • {job.time}</div>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">{job.customer}</td>
                        <td className="p-3 text-slate-600 font-medium">{job.tech}</td>
                        <td className="p-3">
                          {job.status === 'Completed' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                          )}
                          {job.status === 'In Progress' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3" /> In Progress
                            </span>
                          )}
                          {job.status === 'Scheduled' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                              <Calendar className="w-3 h-3" /> Scheduled
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">{job.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Interactive Dispatch Route Map Box */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-900">Smart Dispatch Map</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Live Route GPS</span>
              </div>
              <div className="flex-1 bg-slate-200 rounded-lg relative overflow-hidden border border-slate-300 min-h-[180px] flex items-center justify-center">
                {/* Simulated Google Map Canvas with Pin Markers */}
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px] opacity-70" />
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-transparent to-sky-500/10" />
                <div className="absolute top-1/3 left-1/4 bg-emerald-600 text-white p-1.5 rounded-full shadow-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="absolute bottom-1/3 right-1/3 bg-blue-600 text-white p-1.5 rounded-full shadow-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="absolute top-1/2 right-1/4 bg-amber-600 text-white p-1.5 rounded-full shadow-lg flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-center text-[11px] text-emerald-700 font-bold">
                ✓ Drive paths optimized • 24% fuel saved
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
