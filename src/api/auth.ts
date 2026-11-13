import type { Account, Role } from "../types.ts";
import { apiRequest, ApiError, responseTokens } from "./request.ts";
import { clearSession, getTokens, saveTokens, saveAccount, sessionRevision } from "./session.ts";
import type { RegistrationData } from "../lib/registration.ts";

type AuthResponse = Record<string, unknown> & { user?: unknown };

export function accountFromResponse(data: AuthResponse): Account {
  const user = data?.user as Record<string, unknown> | undefined;
  if (!user || !(typeof user.id === "number" || typeof user.id === "string") || !user.id ||
      typeof user.email !== "string" || !user.email || !Array.isArray(user.roles)) {
    throw new ApiError("The server did not return a valid user account.");
  }
  const roles = [...new Set(user.roles.map((role) => String(role).toLowerCase()))]
    .filter((role): role is Role => ["admin", "technician", "customer"].includes(role));
  if (!roles.length) throw new ApiError("Your account has no supported roles. Contact your service center.");
  const name = [user.first_name, user.last_name].filter((part) => typeof part === "string" && part.trim()).join(" ").trim();
  return {
    // Keep database identities distinct from the existing sample shop accounts.
    id: `db:${user.id}`,
    name: name || (typeof user.username === "string" && user.username) || user.email,
    email: user.email,
    phone: typeof user.phone === "string" ? user.phone : "",
    roles,
  };
}

export async function login(email: string, password: string): Promise<Account> {
  const revision = sessionRevision();
  const response = await apiRequest<AuthResponse>("/user/login", {
    method: "POST", body: { email: email.trim().toLowerCase(), password }, authenticated: false,
  });
  return acceptAuthentication(response, revision);
}

export async function register(data: RegistrationData): Promise<void> {
  const revision = sessionRevision();
  const response = await apiRequest<AuthResponse>("/user/register", {
    method: "POST",
    body: {
      firstName: data.firstName.trim(), lastName: data.lastName.trim(), email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(), drivingLicenseNumber: data.drivingLicenseNumber.trim(), password: data.password,
    },
    authenticated: false,
  });
  if (sessionRevision() !== revision) throw new ApiError("The session has changed. Please try again.");
  if (response.success !== true) throw new ApiError("Unable to create the account. Please try again.");
}

function acceptAuthentication(response: AuthResponse, revision: number): Account {
  const account = accountFromResponse(response);
  const tokens = responseTokens(response);
  if (sessionRevision() !== revision) throw new ApiError("The session has changed. Please try again.");
  saveTokens(tokens);
  saveAccount(account);
  return account;
}

export async function currentAccount(): Promise<Account> {
  const account = accountFromResponse(await apiRequest<AuthResponse>("/user/me"));
  saveAccount(account);
  return account;
}

export async function logout() {
  const tokens = getTokens();
  clearSession();
  if (tokens) {
    await apiRequest("/user/logout", {
      method: "POST", body: { refreshToken: tokens.refreshToken }, authenticated: false,
    });
  }
}
