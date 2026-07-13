import Link from 'next/link';
import Footer from '@/components/Footer';
import PublicNavbar from '@/components/PublicNavbar';

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 font-sans">
      
      {/* Universal Shared Navigation Header Layout */}
      <PublicNavbar theme="dark" />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 space-y-8 text-left">
        <header className="space-y-4 border-b border-slate-900 pb-6">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Last updated: July 12, 2026
          </p>
        </header>

        <article className="space-y-6 text-sm text-slate-400 leading-relaxed font-medium">
          <p>
            Welcome to Prado. These terms and conditions outline the rules and regulations for the use of Prado Systems Inc.'s Field Service Management Platform. By accessing this platform, we assume you accept these terms and conditions in full.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">1. Account Workspace Licenses</h2>
            <p>
              Prado grants organizations a revocable, non-exclusive license to operate our cloud-based database environments. Access levels are strictly constrained by your subscription plan configurations (e.g., Core Tier or Scale Tier options). Sharing authentication context credentials across unlinked operational seats is prohibited.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">2. API Integrations & External Mappings</h2>
            <p>
              Our dynamic geolocation marker resolution system utilizes map routing frameworks. System behaviors require active environment variable coordination. Prado is not liable for structural network delivery anomalies or query errors returned from third-party map providers due to client address inaccuracies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">3. Automated Billing & Bookkeeping Responsibility</h2>
            <p>
              While Prado compiles financial metrics and statement ledgers automatically (such as auto-generating unpaid invoices on Net-15 terms), organizations maintain absolute operational ownership over tax percentage assertions, currency valuations, and payment status tracking modifications.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">4. Limitations of Liability</h2>
            <p>
              In no event shall Prado Systems Inc. be liable for any operational latency, dispatch route deviations, trial account expiration structural cutoffs, or database row discrepancies arising out of administrative changes executed by local organization profiles.
            </p>
          </section>
        </article>
      </main>

      {/* Reusable Public Main Site Footer Component */}
      <Footer />
    </div>
  );
}