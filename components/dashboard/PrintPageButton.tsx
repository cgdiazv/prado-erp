'use client';

interface PrintPageButtonProps {
  label: string;
  href: string;
}

export default function PrintPageButton({ label, href }: PrintPageButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
      className="print-hidden text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 hover:bg-slate-50 transition"
    >
      {label}
    </button>
  );
}
