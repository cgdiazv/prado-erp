'use client';

import { useState } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { submitSupportTicket } from '@/app/actions';

export default function SupportHubPage() {
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans">
      
      {/* Navigation */}
      <nav className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="h-6 w-6 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                <path d="M12 3c.12 4.96-3.03 9.04-7.96 9.17C8.96 12.29 12 16.31 12 21c0-4.69 3.04-8.71 7.96-8.83C15.03 12.04 11.88 7.96 12 3z" />
              </svg>
            </span>
            Prado
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm font-medium text-slate-400 hover:text-white transition">Pricing</Link>
            <Link href="/demo" className="text-sm font-medium text-slate-400 hover:text-white transition">Book Demo</Link>
            <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition">Sign In</Link>
            <Link href="/signup" className="text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg transition">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* Main Container Grid Viewport */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12 text-left items-start">
        
        {/* Left Side Info Blocks */}
        <div className="lg:col-span-1 space-y-6">
          <header className="space-y-3">
            <span className="inline-flex items-center gap-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-full px-3.5 py-1 text-xs text-emerald-400 font-medium backdrop-blur-xs">
              Help Center Directory
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Support Hub
            </h1>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-medium">
              Encountering data synchronization lag, multi-tenant workspace routing blockages, or invoicing setup exceptions? Get direct aid from system deployment engineers.
            </p>
          </header>

          <div className="border border-slate-900 bg-slate-900/10 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Direct Inbox Routing</h3>
            <p className="text-xs text-slate-400 font-medium">
              Prefer writing outside form spaces? Drop our pipeline managers a secure technical diagnostic record directly:
            </p>
            <a 
              href="mailto:support@pradojob.com" 
              className="block text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition underline decoration-emerald-500/30"
            >
              support@pradojob.com
            </a>
          </div>
        </div>

        {/* Right Side Interactive Ticketing Section Form Container */}
        <div className="lg:col-span-2 bg-slate-900/20 border border-slate-900 rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-lg font-bold text-white tracking-tight mb-1">Open Technical Support Ticket</h2>
          <p className="text-xs text-slate-400 mb-6 font-medium">Dispatches an operational log notification parameter to engineer teams immediately.</p>

          {formStatus === 'success' ? (
            <div className="p-6 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs rounded-xl font-semibold text-center leading-relaxed">
              ✓ Support request logged securely! A system engineer has been paged via Resend and will respond to your provided business email address shortly.
            </div>
          ) : (
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setFormStatus('loading');
                setErrorMessage('');
                
                const data = new FormData(e.currentTarget);
                const result = await submitSupportTicket(data);
                
                if (result?.error) {
                  setErrorMessage(result.error);
                  setFormStatus('error');
                } else {
                  setFormStatus('success');
                }
              }} 
              className="space-y-4"
            >
              {formStatus === 'error' && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 text-rose-400 text-xs rounded-lg font-medium">
                  ✕ {errorMessage || 'Failed to dispatch ticket pipeline.'}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Your Name</label>
                  <input 
                    type="text" 
                    name="name"
                    required 
                    placeholder="Jane Doe" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Business Email Address</label>
                  <input 
                    type="email" 
                    name="email"
                    required 
                    placeholder="jane@organization.com" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Urgency Tier Classification</label>
                <select 
                  name="urgency"
                  required 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium cursor-pointer"
                >
                  <option value="low">Low — General Technical/Usage Inquiries</option>
                  <option value="medium">Medium — Operational Lag or Interface Issues</option>
                  <option value="high">High — System Outage, Invoicing Blockage or RLS Failures</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 tracking-wider">Diagnostic Details / Core Message</label>
                <textarea 
                  name="message"
                  required 
                  rows={5}
                  placeholder="Provide precise descriptions of the issue, error codes, or context identifiers..." 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium resize-none leading-relaxed" 
                />
              </div>

              <button 
                type="submit" 
                disabled={formStatus === 'loading'} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl transition shadow-xl mt-2 cursor-pointer"
              >
                {formStatus === 'loading' ? 'Transmitting Ticket Metrics...' : 'Dispatch Support Ticket'}
              </button>
            </form>
          )}
        </div>

      </main>

      {/* Reusable Public Main Site Footer Component */}
      <Footer />
    </div>
  );
}