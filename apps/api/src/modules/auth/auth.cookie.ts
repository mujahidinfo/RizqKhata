import type { Request, Response } from 'express';

/**
 * Refresh-token cookie for browser clients (the Expo web build).
 *
 * Phones keep the refresh token in the device keychain and send it in the
 * body. In a browser any script on the page could read storage, so there the
 * API keeps the refresh token in an httpOnly cookie instead and never puts it
 * in a response body.
 *
 * A client opts in per request with `X-Auth-Transport: cookie`. The cookie is
 * only read when that header is present: a custom header forces a CORS
 * preflight that only allowed origins pass, so a third-party page cannot make
 * the browser spend the cookie (on top of SameSite=Lax).
 */
export const REFRESH_COOKIE = 'rk_rt';
const COOKIE_PATH = '/api/v1/auth';

export const wantsCookie = (req: Request) =>
  String(req.headers['x-auth-transport'] ?? '').toLowerCase() === 'cookie';

export function readRefreshCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === REFRESH_COOKIE) {
      return decodeURIComponent(part.slice(eq + 1).trim()) || undefined;
    }
  }
  return undefined;
}

export function setRefreshCookie(res: Response, token: string, expires: Date, secure: boolean) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: COOKIE_PATH,
    expires,
  });
}

export function clearRefreshCookie(res: Response, secure: boolean) {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure, sameSite: 'lax', path: COOKIE_PATH });
}
