import { NextResponse } from 'next/server';
import acceptLanguage from 'accept-language';
import { fallbackLng, languages, cookieName } from './settings.js';

acceptLanguage.languages(languages);
const PUBLIC_FILE = /\.[^/]+$/;

export const config = {
  // matcher: '/:lng*'
  matcher: ['/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js|.*\\..*).*)'],
};

export function middleware(req) {
  const hostname = req.nextUrl.hostname.toLowerCase();
  const isMainDomain = hostname === 'pradojob.com' || hostname === 'www.pradojob.com';
  const isDashboardPath = /^\/(?:en\/|es\/)?dashboard(?:\/|$)/.test(req.nextUrl.pathname);

  if (isMainDomain && isDashboardPath) {
    const destination = req.nextUrl.clone();
    destination.hostname = 'app.pradojob.com';
    destination.protocol = 'https:';
    destination.port = '';
    return NextResponse.redirect(destination);
  }

  if (PUBLIC_FILE.test(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  let lng;
  if (req.cookies.has(cookieName)) lng = acceptLanguage.get(req.cookies.get(cookieName).value);
  if (!lng) lng = acceptLanguage.get(req.headers.get('Accept-Language'));
  if (!lng) lng = fallbackLng;

  // Redirect if lng in path is not supported
  if (
    !languages.some(loc => req.nextUrl.pathname.startsWith(`/${loc}`)) &&
    !req.nextUrl.pathname.startsWith('/_next')
  ) {
    return NextResponse.redirect(new URL(`/${lng}${req.nextUrl.pathname}`, req.url));
  }

  if (req.headers.has('referer')) {
    const refererUrl = new URL(req.headers.get('referer'));
    const lngInReferer = languages.find(l => refererUrl.pathname.startsWith(`/${l}`));
    const response = NextResponse.next();
    if (lngInReferer) response.cookies.set(cookieName, lngInReferer);
    return response;
  }

  return NextResponse.next();
}