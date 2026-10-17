"use client";

import Script from 'next/script';
import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { getTranslations } from '@/lib/translations';

type CookieConsentState = {
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

const STORAGE_KEY = 'prado_cookie_consent_v1';
const COOKIE_NAME = 'prado_cookie_consent_v1';

const TRACKING_COOKIE_NAMES = ['_ga', '_gid', '_gat', '_gcl_au'];

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (!e.key || e.key === STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

let cachedConsentRaw: string | null = '__init__';
let cachedConsentState: CookieConsentState | null = null;

function getConsentSnapshot(): CookieConsentState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (rawValue === cachedConsentRaw) {
      return cachedConsentState;
    }
    cachedConsentRaw = rawValue;
    if (!rawValue) {
      cachedConsentState = null;
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<CookieConsentState>;
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.marketing !== 'boolean') {
      cachedConsentState = null;
      return null;
    }

    cachedConsentState = {
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
    return cachedConsentState;
  } catch {
    cachedConsentState = null;
    return null;
  }
}

function getServerConsentSnapshot(): CookieConsentState | null {
  return null;
}

function getAcknowledgmentSnapshot(): boolean {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    const hasCookie = typeof document !== 'undefined' && document.cookie.includes(`${COOKIE_NAME}=`);
    return Boolean(raw || hasCookie);
  } catch {
    return true;
  }
}

function getServerAcknowledgmentSnapshot(): boolean {
  return true;
}

function writeStoredConsent(nextConsent: CookieConsentState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextConsent));
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(nextConsent))}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
  notifyListeners();
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
}

function purgeTrackingCookies() {
  TRACKING_COOKIE_NAMES.forEach((name) => deleteCookie(name));
}

function getLocaleFromPathname(pathname: string | null) {
  return pathname?.split('/')[1]?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

function loadChatbaseScript() {
  return `
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

      if (document.getElementById(chatbotId)) {
        return;
      }

      const chatbaseScript = document.createElement('script');
      chatbaseScript.id = chatbotId;
      chatbaseScript.src = 'https://www.chatbase.co/embed.min.js';
      chatbaseScript.domain = 'www.chatbase.co';
      document.body.appendChild(chatbaseScript);
    })();
  `;
}

function gtagInitScript() {
  return `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'AW-1005758859', { anonymize_ip: true });
  `;
}

export default function CookieConsentBanner() {
  const pathname = usePathname();
  const locale = useMemo(() => getLocaleFromPathname(pathname), [pathname]);
  const translations = useMemo(() => getTranslations(locale), [locale]);

  const isAcknowledged = useSyncExternalStore(subscribe, getAcknowledgmentSnapshot, getServerAcknowledgmentSnapshot);
  const consent = useSyncExternalStore(subscribe, getConsentSnapshot, getServerConsentSnapshot);

  const [showSettings, setShowSettings] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    const openSettings = () => {
      setAnalyticsEnabled(consent?.analytics ?? false);
      setMarketingEnabled(consent?.marketing ?? false);
      setShowSettings(true);
    };

    window.addEventListener('prado:open-cookie-settings', openSettings as EventListener);
    return () => {
      window.removeEventListener('prado:open-cookie-settings', openSettings as EventListener);
    };
  }, [consent]);

  const saveConsent = (nextConsent: CookieConsentState) => {
    const previousConsent = consent;
    writeStoredConsent(nextConsent);

    if (!nextConsent.analytics || !nextConsent.marketing) {
      purgeTrackingCookies();
    }

    const withdrewConsent =
      Boolean(previousConsent) &&
      ((previousConsent?.analytics && !nextConsent.analytics) || (previousConsent?.marketing && !nextConsent.marketing));

    if (withdrewConsent) {
      window.location.reload();
    }
  };

  const acceptAll = () => {
    saveConsent({ analytics: true, marketing: true, updatedAt: new Date().toISOString() });
    setShowSettings(false);
  };

  const rejectNonEssential = () => {
    saveConsent({ analytics: false, marketing: false, updatedAt: new Date().toISOString() });
    setShowSettings(false);
  };

  const saveCustomPreferences = () => {
    saveConsent({ analytics: analyticsEnabled, marketing: marketingEnabled, updatedAt: new Date().toISOString() });
    setShowSettings(false);
  };

  const consentBanner = !isAcknowledged ? (
    <div
      role="region"
      aria-label="Cookie acknowledgment"
      className="fixed bottom-0 inset-x-0 w-full z-50 border-t border-emerald-500/25 bg-slate-950/95 backdrop-blur-md px-4 py-5 sm:px-6 sm:py-4.5 text-slate-300 shadow-[0_-8px_32px_rgba(0,0,0,0.65)]"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-6 text-sm">
        {/* Strip content */}
        <div className="min-w-0">
          <p className="leading-relaxed">
            <span>{translations.cookies.message}</span>{" "}
            <Link
              href={`/${locale}/privacy`}
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors whitespace-nowrap font-medium"
            >
              {translations.cookies.privacyPolicy}
            </Link>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition-all hover:bg-emerald-400 active:scale-95 cursor-pointer shadow-md whitespace-nowrap"
          >
            {translations.cookies.accept}
          </button>
          <button
            type="button"
            onClick={rejectNonEssential}
            aria-label={translations.cookies.dismiss}
            title={translations.cookies.dismiss}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  ) : null;

  const settingsDialog = showSettings ? (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center sm:p-6" role="presentation" onClick={() => setShowSettings(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
        className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5 sm:p-6">
          <div>
            <h2 id="cookie-settings-title" className="text-lg font-bold tracking-tight text-white">
              {translations.cookies.settingsTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{translations.cookies.settingsDescription}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="rounded-full border border-slate-800 px-3 py-1 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <input type="checkbox" checked disabled className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500" />
            <span>
              <span className="block text-sm font-semibold text-white">{translations.cookies.essentialTitle}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-400">{translations.cookies.essentialDescription}</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <input
              type="checkbox"
              checked={analyticsEnabled}
              onChange={(event) => setAnalyticsEnabled(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span>
              <span className="block text-sm font-semibold text-white">{translations.cookies.analyticsTitle}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-400">{translations.cookies.analyticsDescription}</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <input
              type="checkbox"
              checked={marketingEnabled}
              onChange={(event) => setMarketingEnabled(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span>
              <span className="block text-sm font-semibold text-white">{translations.cookies.marketingTitle}</span>
              <span className="mt-1 block text-sm leading-6 text-slate-400">{translations.cookies.marketingDescription}</span>
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-end sm:p-6">
          <button
            type="button"
            onClick={rejectNonEssential}
            className="rounded-xl border border-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            {translations.cookies.rejectNonEssential}
          </button>
          <button
            type="button"
            onClick={saveCustomPreferences}
            className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
          >
            {translations.cookies.savePreferences}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {consent?.marketing ? (
        <>
          <Script id="google-ads-gtag" src="https://www.googletagmanager.com/gtag/js?id=AW-1005758859" strategy="afterInteractive" />
          <Script id="google-ads-gtag-init" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: gtagInitScript() }} />
        </>
      ) : null}

      {consent?.analytics ? (
        <Script id="chatbase-integration-global" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: loadChatbaseScript() }} />
      ) : null}

      {consentBanner}
      {settingsDialog}
    </>
  );
}