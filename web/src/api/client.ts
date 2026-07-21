import { GATEWAY_URL } from '../config';

export interface ApiError extends Error {
  status: number;
  body: any;
}

/** Thin fetch wrapper: sends the session cookie, parses JSON, throws ApiError on !ok. */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}`) as ApiError;
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
