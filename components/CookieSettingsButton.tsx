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
      className="inline-flex items-center rounded-xl border border-[#d0d5dd] bg-white px-4 py-2 text-xs font-semibold text-[#344054] shadow-xs transition hover:border-[#0a9d73] hover:text-[#0a9d73] hover:bg-[#f9fafb] cursor-pointer"
    >
      {translations.cookies.managePreferences}
    </button>
  );
}