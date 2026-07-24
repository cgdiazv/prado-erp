"use client";

import { getTranslations } from '@/lib/translations';

interface CookieSettingsButtonProps {
  locale: string;
}

export default function CookieSettingsButton({ locale }: CookieSettingsButtonProps) {
  const translations = getTranslations(locale);

  const openCookieSettings = () => {
    window.dispatchEvent(new Event('prado:open-cookie-settings'));
  };

  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200"
    >
      {translations.cookies.managePreferences}
    </button>
  );
}