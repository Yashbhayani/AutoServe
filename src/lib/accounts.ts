import type { Account, AppUser, Role } from "../types";

export const emailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export function accountForIdentifier(accounts: Account[], identifier: string) {
  const value = identifier.trim().toLowerCase();
  if (!value) return undefined;
  const phone = value.replace(/\D/g, "");
  return accounts.find((account) => account.email.toLowerCase() === value ||
    (!value.includes("@") && phone.length >= 10 && account.phone.replace(/\D/g, "") === phone));
}

export function userRole(role: AppUser["role"]): Role {
  return role === "Admin" || role === "Service Manager" ? "admin" : role === "Technician" ? "technician" : "customer";
}
