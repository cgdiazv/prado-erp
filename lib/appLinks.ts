export const APP_BASE_URL = 'https://app.pradojob.com';

export function getAppPageUrl(locale: string, page: 'login' | 'signup') {
  return `${APP_BASE_URL}/${locale}/${page}`;
}
