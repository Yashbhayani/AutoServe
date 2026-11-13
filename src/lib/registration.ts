import { emailValid } from "./accounts.ts";

export type RegistrationData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  drivingLicenseNumber: string;
  password: string;
};

export type RegistrationErrors = Partial<Record<keyof RegistrationData | "confirmPassword", string>>;

export function registrationErrors(data: RegistrationData, confirmPassword: string): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!data.firstName.trim() || data.firstName.trim().length > 50) errors.firstName = "Enter your first name (up to 50 characters).";
  if (!data.lastName.trim() || data.lastName.trim().length > 50) errors.lastName = "Enter your last name (up to 50 characters).";
  if (!emailValid(data.email) || data.email.trim().length > 120) errors.email = "Enter a valid email address (up to 120 characters).";
  if (!data.password.trim() || data.password.length < 8) errors.password = "Use at least 8 characters.";
  else if (new TextEncoder().encode(data.password).length > 72) errors.password = "Password is too long. Use a shorter password.";
  if (data.password !== confirmPassword) errors.confirmPassword = "Your passwords do not match.";
  if (data.phone.trim() && (data.phone.trim().length > 20 || data.phone.replace(/\D/g, "").length < 10)) errors.phone = "Enter a phone number with at least 10 digits (up to 20 characters).";
  if (data.drivingLicenseNumber.trim().length > 50) errors.drivingLicenseNumber = "Use 50 characters or fewer.";
  return errors;
}
