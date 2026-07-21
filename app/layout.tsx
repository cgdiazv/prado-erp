import type { Metadata } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Prado | Streamlined Operations & Job Management',
    template: '%s | Prado',
  },
  description:
    'The all-in-one workspace built for modern service and landscaping professionals. Schedule jobs, manage team workflows, track customers, and simplify billing seamlessly.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head />
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-1005758859"
          strategy="afterInteractive"
        />
        <Script
          id="google-ads-gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-1005758859');
            `,
          }}
        />
        {children}
        <Script
          id="chatbase-integration-global"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const chatbotId = 'QBldWxwKvYFFN27nBni1s';

                if (!window.chatbase || window.chatbase('getState') !== 'initialized') {
                  window.chatbase = (...args) => {
                    if (!window.chatbase.q) {
                      window.chatbase.q = [];
                    }
                    window.chatbase.q.push(args);
                  };

                  window.chatbase = new Proxy(window.chatbase, {
                    get(target, prop) {
                      if (prop === 'q') {
                        return target.q;
                      }

                      return (...args) => target(prop, ...args);
                    },
                  });
                }

                const loadChatbase = () => {
                  if (document.getElementById(chatbotId)) {
                    return;
                  }

                  const chatbaseScript = document.createElement('script');
                  chatbaseScript.id = chatbotId;
                  chatbaseScript.src = 'https://www.chatbase.co/embed.min.js';
                  chatbaseScript.domain = 'www.chatbase.co';
                  document.body.appendChild(chatbaseScript);
                };

                if (document.readyState === 'complete') {
                  loadChatbase();
                } else {
                  window.addEventListener('load', loadChatbase, { once: true });
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}