"use client";

import Script from 'next/script';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getTranslations } from '@/lib/translations';

type CookieConsentState = {
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

const STORAGE_KEY = 'prado_cookie_consent_v1';
const COOKIE_NAME = 'prado_cookie_consent_v1';

const TRACKING_COOKIE_NAMES = ['_ga', '_gid', '_gat', '_gcl_au'];

function getLocaleFromPathname(pathname: string | null) {
  return pathname?.split('/')[1]?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

function readStoredConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<CookieConsentState>;
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.marketing !== 'boolean') {
      return null;
    }

    return {
      analytics: parsed.analytics,
      marketing: parsed.marketing,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeStoredConsent(nextConsent: CookieConsentState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextConsent));
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(nextConsent))}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
}

function purgeTrackingCookies() {
  TRACKING_COOKIE_NAMES.forEach((name) => deleteCookie(name));
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

  const [hydrated, setHydrated] = useState(false);
  const [consent, setConsent] = useState<CookieConsentState | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  useEffect(() => {
    const existingConsent = readStoredConsent();
    setConsent(existingConsent);
    setAnalyticsEnabled(existingConsent?.analytics ?? false);
    setMarketingEnabled(existingConsent?.marketing ?? false);
    setHydrated(true);
  }, []);

  useEffect(() => {
    const openSettings = () => setShowSettings(true);

    window.addEventListener('prado:open-cookie-settings', openSettings as EventListener);
    return () => {
      window.removeEventListener('prado:open-cookie-settings', openSettings as EventListener);
    };
  }, []);

  const saveConsent = (nextConsent: CookieConsentState) => {
    const previousConsent = consent;
    setConsent(nextConsent);
    setAnalyticsEnabled(nextConsent.analytics);
    setMarketingEnabled(nextConsent.marketing);
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

  if (!hydrated) {
    return null;
  }

  const consentBanner = !consent ? (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/95 text-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-400">{translations.cookies.title}</p>
            <p className="text-sm leading-6 text-slate-300">{translations.cookies.description}</p>
            <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="font-semibold text-slate-100">{translations.cookies.essentialTitle}</p>
                <p className="mt-1 leading-5">{translations.cookies.essentialDescription}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="font-semibold text-slate-100">{translations.cookies.analyticsTitle}</p>
                <p className="mt-1 leading-5">{translations.cookies.analyticsDescription}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="font-semibold text-slate-100">{translations.cookies.marketingTitle}</p>
                <p className="mt-1 leading-5">{translations.cookies.marketingDescription}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <button
              type="button"
              onClick={acceptAll}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              {translations.cookies.acceptAll}
            </button>
            <button
              type="button"
              onClick={rejectNonEssential}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              {translations.cookies.rejectNonEssential}
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
            >
              {translations.cookies.managePreferences}
            </button>
            <p className="text-xs leading-5 text-slate-400">
              <Link href="/privacy" className="font-semibold text-slate-200 underline decoration-slate-500 underline-offset-4 hover:text-white">
                {translations.cookies.privacyLink}
              </Link>
            </p>
          </div>
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