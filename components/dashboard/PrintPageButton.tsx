'use client';

interface PrintPageButtonProps {
  label: string;
}

export default function PrintPageButton({ label }: PrintPageButtonProps) {
  const handlePrint = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=800');

    if (!popup) {
      window.print();
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');

    popup.document.open();
    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${document.title}</title>
          ${styles}
        </head>
        <body>
          ${document.body.innerHTML}
        </body>
      </html>
    `);
    popup.document.close();

    popup.onload = () => {
      popup.focus();
      popup.print();
      popup.close();
    };
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="print-hidden text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 hover:bg-slate-50 transition"
    >
      {label}
    </button>
  );
}
