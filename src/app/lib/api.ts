// src/app/lib/api.ts
// ============================================================
// Central API client for OmniScan.
// Every network call to the FastAPI backend goes through here.
// Reads the JWT token from localStorage and attaches it automatically.
// ============================================================

if (!import.meta.env.VITE_API_BASE_URL) {
  throw new Error(
    'VITE_API_BASE_URL is not set. Create a .env file with VITE_API_BASE_URL=<backend URL> and restart the dev server.'
  );
}

export const API_BASE: string = import.meta.env.VITE_API_BASE_URL;

const TOKEN_KEY = 'omniscan_token';
const USER_KEY = 'omniscan_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export interface StoredUser {
  id: string;
  full_name: string;
  email: string;
  role: 'system_admin' | 'trade_manager' | 'data_entry_operator' | 'finance_officer';
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions extends RequestInit {
  /** Skip attaching the Authorization header (used for login) */
  noAuth?: boolean;
}

/**
 * Core fetch wrapper. Attaches JWT, parses JSON, throws ApiError on failure.
 * On 401, clears the stored session so the app can redirect to login.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { noAuth, headers, ...rest } = options;
  const token = getToken();

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  // Don't force JSON content-type when sending FormData (browser sets boundary itself)
  if (!(rest.body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (token && !noAuth) {
    finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers: finalHeaders });

  if (res.status === 401) {
    clearToken();
    // Let the app know the session died so it can show the login screen
    window.dispatchEvent(new CustomEvent('omniscan:unauthorized'));
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  // No-content responses (some PATCH/DELETE)
  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    // FastAPI error shape: { detail: { detail: "msg", error_code: "CODE" } } or { detail: "msg" }
    let message = `Request failed (${res.status})`;
    let code: string | undefined;
    if (isJson && data) {
      if (typeof data.detail === 'string') message = data.detail;
      else if (data.detail?.detail) {
        message = data.detail.detail;
        code = data.detail.error_code;
      }
    }
    throw new ApiError(message, res.status, code);
  }

  return data as T;
}

export const api = {
  get: <T,>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T,>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  patch: <T,>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T,>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
  /** Returns a Blob — used for PDF/Excel/CSV downloads */
  async blob(path: string, options?: RequestOptions): Promise<Blob> {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options?.headers as Record<string, string>) },
    });
    if (res.status === 401) {
      clearToken();
      window.dispatchEvent(new CustomEvent('omniscan:unauthorized'));
      throw new ApiError('Session expired. Please log in again.', 401);
    }
    if (!res.ok) throw new ApiError(`Download failed (${res.status})`, res.status);
    return res.blob();
  },
};

/** Trigger a browser download for a Blob with a given filename */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
