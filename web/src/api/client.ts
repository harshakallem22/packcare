import { GATEWAY_URL } from '../config';

export interface ApiError extends Error {
  status: number;
  body: any;
}

/**
 * Turn an HTTP failure into a message a non-technical user can understand.
 * Prefers a human-readable `message` the server sent; otherwise falls back to
 * friendly copy keyed off the status code. Never surfaces raw method/path/status.
 */
function friendlyMessage(status: number, body: any): string {
  if (body && typeof body.message === 'string' && body.message.trim()) return body.message;

  switch (status) {
    case 400:
    case 422:
      return "Some of the details don't look right. Please check what you entered and try again.";
    case 401:
      return 'Your session has ended. Please sign in again.';
    case 403:
      return "You don't have permission to do that.";
    case 404:
      return "We couldn't find what you were looking for. Please double-check and try again.";
    case 409:
      return 'That was already recorded, so nothing was changed.';
    case 429:
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      if (status >= 500) return 'Something went wrong on our end. Please try again in a moment.';
      return 'Something went wrong. Please try again.';
  }
}

/** Thin fetch wrapper: sends the session cookie, parses JSON, throws a friendly ApiError on failure. */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${GATEWAY_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only rejects on network-level failures (server unreachable, offline).
    const err = new Error("We can't reach the server right now. Please check your connection and try again.") as ApiError;
    err.status = 0;
    err.body = null;
    throw err;
  }

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null; // non-JSON response (e.g. a proxy error page)
  }

  if (!res.ok) {
    const err = new Error(friendlyMessage(res.status, parsed)) as ApiError;
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
};
