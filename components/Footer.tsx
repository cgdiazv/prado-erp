'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-6 px-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-600">
        
        {/* Left-Aligned Copyright Notice */}
        <div className="text-left font-medium text-slate-500">
          &copy; {new Date().getFullYear()} Prado Systems. All rights reserved.
        </div>

        {/* Right-Aligned Marketing & Compliance Links */}
        <div className="flex items-center gap-6 font-medium text-slate-400">
          <Link 
            href="/privacy" 
            className="hover:text-white transition"
          >
            Privacy Policy
          </Link>
          <Link 
            href="/terms" 
            className="hover:text-white transition"
          >
            Terms & Conditions
          </Link>
          <Link 
            href="/support" 
            className="transition-colors text-slate-400 hover:text-emerald-400"
          >
            Support
          </Link>
        </div>

      </div>
    </footer>
  );
}