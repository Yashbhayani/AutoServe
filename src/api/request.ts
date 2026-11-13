import { clearSession, getTokens, saveTokens, sessionRevision, type Tokens } from "./session.ts";

const baseUrl = (import.meta.env?.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  authenticated?: boolean;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function responseTokens(value: unknown): Tokens {
  const data = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const accessToken = data["access-token"];
  const refreshToken = data["refresh-token"];
  if (typeof accessToken !== "string" || !accessToken || typeof refreshToken !== "string" || !refreshToken) {
    throw new ApiError("The server returned an incomplete sign-in response.");
  }
  return { accessToken, refreshToken };
}

async function send(path: string, options: RequestOptions, accessToken?: string): Promise<unknown> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value !== null && value !== undefined) query.set(key, String(value));
  }
  const url = `${baseUrl}/${path.replace(/^\/+/, "")}${query.size ? `?${query}` : ""}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  let text: string;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    text = await response.text();
  } catch {
    throw new ApiError(controller.signal.aborted
      ? "The server took too long to respond. Please try again."
      : "Unable to reach the server. Check your connection and that the backend is running.");
  } finally { clearTimeout(timeout); }

  const gatewayMessage = response.status === 502
    ? "Unable to reach the backend service. Check that the backend is running and the API proxy address is correct."
    : response.status === 504 ? "The backend service took too long to respond. Please try again."
    : response.status === 503 ? "The backend service is temporarily unavailable. Please try again later." : "";
  let data: unknown;
  try { data = text ? JSON.parse(text) : null; }
  catch { throw new ApiError(gatewayMessage || "The server returned an invalid response. Check the API URL.", response.status); }
  const result = data as { success?: boolean; message?: string } | null;
  if (!response.ok || result?.success === false) {
    throw new ApiError(typeof result?.message === "string" ? result.message : gatewayMessage || `Request failed (${response.status}).`, response.status);
  }
  return data;
}

let refreshing: { refreshToken: string; promise: Promise<void> } | null = null;
async function refreshSession() {
  const original = getTokens();
  if (!original) throw new ApiError("Please sign in again.", 401);
  if (refreshing?.refreshToken === original.refreshToken) return refreshing.promise;
  const promise = (async () => {
    try {
      const data = await send("/user/refresh", { method: "POST", body: { refreshToken: original.refreshToken } });
      if (getTokens()?.refreshToken !== original.refreshToken) throw new ApiError("The session has changed. Please sign in again.", 401);
      saveTokens(responseTokens(data), true);
    } catch (error) {
      if (getTokens()?.refreshToken === original.refreshToken) clearSession(
        error instanceof ApiError ? error.message : "Your session has expired. Please sign in again.");
      throw error;
    }
  })();
  refreshing = { refreshToken: original.refreshToken, promise };
  try { await promise; } finally { if (refreshing?.promise === promise) refreshing = null; }
}

/** All backend requests pass through this helper: JSON, query parameters, Bearer auth and one refresh/retry. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const revision = sessionRevision();
  const original = options.authenticated === false ? null : getTokens();
  try {
    const data = await send(path, options, original?.accessToken);
    if (original && sessionRevision() !== revision) throw new ApiError("The session has changed. Please try again.", 401);
    return data as T;
  }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !original) throw error;
    if (sessionRevision() !== revision) throw error;
    // Another request may already have refreshed the access token.
    if (getTokens()?.accessToken === original.accessToken) await refreshSession();
    const current = getTokens();
    if (!current) throw new ApiError("Your session has expired. Please sign in again.", 401);
    try {
      const data = await send(path, options, current.accessToken);
      if (sessionRevision() !== revision) throw new ApiError("The session has changed. Please try again.", 401);
      return data as T;
    }
    catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401 && getTokens()?.accessToken === current.accessToken) {
        clearSession("Your session has expired. Please sign in again.");
      }
      throw retryError;
    }
  }
}
