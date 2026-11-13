import type { Account } from "../types.ts";
export type Tokens = { accessToken: string; refreshToken: string };

const STORAGE_KEY = "as_auth_tokens";
let tokens: Tokens | null | undefined;
let revision = 0;
const listeners = new Set<(reason?: string) => void>();

export function getTokens(): Tokens | null {
  if (tokens !== undefined) return tokens;
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    tokens = saved && typeof saved.accessToken === "string" && saved.accessToken &&
      typeof saved.refreshToken === "string" && saved.refreshToken ? saved : null;
  } catch { tokens = null; }
  return tokens ?? null;
}

export const sessionRevision = () => revision;

export function saveTokens(next: Tokens, rotating = false) {
  tokens = next;
  if (!rotating) revision++;
  // Authentication still works in memory when browser storage is unavailable.
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* memory only */ }
}

/** Cache only the safe profile; never persist passwords or raw database rows. */
export function saveAccount(account: Account) {
  const {id, name, email, phone, roles} = account;
  try { sessionStorage.setItem("as_account", JSON.stringify({id, name, email, phone, roles})); } catch { /* React keeps the profile in memory. */ }
}

export function clearSession(reason?: string) {
  tokens = null;
  revision++;
  try {
    for (const key of [STORAGE_KEY, "as_account", "as_user", "as_roles", "as_shop_v2"]) sessionStorage.removeItem(key);
  } catch { /* memory has already been cleared */ }
  listeners.forEach((listener) => listener(reason));
}

export function onSessionCleared(listener: (reason?: string) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
