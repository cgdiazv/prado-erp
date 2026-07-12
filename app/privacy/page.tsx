import Link from 'next/link';
import Footer from '@/components/Footer';

export default function PrivacyPolicyPage() {
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

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-16 space-y-8 text-left">
        <header className="space-y-4 border-b border-slate-900 pb-6">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Last updated: July 12, 2026
          </p>
        </header>

        <article className="space-y-6 text-sm text-slate-400 leading-relaxed font-medium">
          <p>
            At Prado, accessible from our public web portal, one of our main priorities is the privacy of our operational users. This Privacy Policy document contains types of information that is collected and recorded by Prado and how we utilize it securely within the cloud.
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">1. Information We Collect</h2>
            <p>
              Prado processes fields strictly necessary to maintain optimized operational workflows. This includes customer routing details, field service street addresses, spatial geocoding coordinates via mapping engines, service visit histories, expenses, and statement invoices generated through account ledgers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">2. How We Use Your Information</h2>
            <p>
              We operate structural matrices to isolate data components securely. The collected vectors are processed to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Formulate and optimize driving path algorithms for multi-occupancy dispatch teams.</li>
              <li>Provide and maintain interactive mapping boundaries using external geocoding providers.</li>
              <li>Automate bookkeeping parameters, calculate tax variations, and securely issue tenant statements.</li>
              <li>Manage organization sessions, access tokens, and protect accounts against systemic RLS bypass actions.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">3. Data Retention & Isolation</h2>
            <p>
              All customer, site property context, and historical log details are systematically isolated based on organization ID parameters. Data rows remain actively recorded on our cloud architecture until an authorized operator triggers a explicit client or property profile removal.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white tracking-tight">4. Contact Channels</h2>
            <p>
              If you have additional questions or require more information about our technical handling procedures, do not hesitate to reach out directly through our internal operational help desk inside the Support Hub.
            </p>
          </section>
        </article>
      </main>

      {/* Reusable Public Main Site Footer Component */}
      <Footer />
    </div>
  );
}