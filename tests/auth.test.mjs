import assert from "node:assert/strict";
import { beforeEach, after, test } from "node:test";
import { accountFromResponse, currentAccount, login, logout, register } from "../src/api/auth.ts";
import { registrationErrors } from "../src/lib/registration.ts";
import { apiRequest, ApiError } from "../src/api/request.ts";
import { clearSession, getTokens, saveTokens, onSessionCleared } from "../src/api/session.ts";

const originalFetch = globalThis.fetch;
const data = new Map();
globalThis.sessionStorage = {
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => data.set(key, value),
  removeItem: (key) => data.delete(key),
};
const user = { id: 42, email: "alex@example.com", first_name: "Alex", last_name: "Rivera", phone: "5551234567", roles: ["CUSTOMER", "TECHNICIAN"] };
const success = { success: true, user, "access-token": "access", "refresh-token": "refresh" };
const registration = { firstName: " Alex ", lastName: " Rivera ", email: " ALEX@example.com ", phone: "", drivingLicenseNumber: "", password: "correct-password" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
beforeEach(() => { clearSession(); data.clear(); });
after(() => { globalThis.fetch = originalFetch; });

test("login sends email/password JSON and uses the backend identity and roles", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/user/login");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { email: "alex@example.com", passwordHash: " secret " });
    assert.equal(options.headers.Authorization, undefined);
    return json(success);
  };
  const account = await login(" ALEX@example.com ", " secret ");
  assert.equal(account.id, "db:42");
  assert.deepEqual(JSON.parse(data.get("as_account")), account);
  assert.equal(data.get("as_account").includes("secret"), false);
  assert.equal(account.name, "Alex Rivera");
  assert.deepEqual(account.roles, ["customer", "technician"]);
  assert.equal(getTokens().accessToken, "access");
});

test("incorrect passwords never create a session", async () => {
  globalThis.fetch = async () => json({ success: false, message: "Invalid email or password." }, 401);
  await assert.rejects(login(user.email, "wrong"), { message: "Invalid email or password.", status: 401 });
  assert.equal(getTokens(), null);
});

test("incomplete login responses and unsupported roles cannot authenticate", async () => {
  globalThis.fetch = async () => json({ success: true, user });
  await assert.rejects(login(user.email, "secret"), /incomplete sign-in response/);
  assert.equal(getTokens(), null);
  assert.throws(() => accountFromResponse({ user: { ...user, roles: ["UNKNOWN"] } }), /no supported roles/);
});

test("session restoration reads the account from the server with a Bearer token", async () => {
  saveTokens({ accessToken: "access", refreshToken: "refresh" });
  data.set("as_roles", '["admin"]');
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/user/me");
    assert.equal(options.headers.Authorization, "Bearer access");
    return json({ success: true, user });
  };
  assert.deepEqual((await currentAccount()).roles, ["customer", "technician"]);
});

test("the same helper supports methods, encoded parameters, and bodyless responses", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/parts/7?search=brake+%26+oil&page=2");
    assert.equal(options.method, "DELETE");
    assert.equal(options.body, undefined);
    assert.equal(options.headers["Content-Type"], undefined);
    return new Response(null, { status: 204 });
  };
  assert.equal(await apiRequest("/parts/7", { method: "DELETE", params: { search: "brake & oil", page: 2, omit: null } }), null);
});

test("concurrent unauthorized requests share one refresh and retry once", async () => {
  saveTokens({ accessToken: "old", refreshToken: "refresh" });
  let refreshCount = 0;
  let oldCalls = 0;
  let release;
  const bothStarted = new Promise((resolve) => { release = resolve; });
  globalThis.fetch = async (url, options) => {
    if (url.endsWith("/refresh")) {
      refreshCount++;
      await bothStarted;
      return json({ ...success, "access-token": "new", "refresh-token": "rotated" });
    }
    if (options.headers.Authorization === "Bearer old") {
      if (++oldCalls === 2) release();
      return json({ success: false }, 401);
    }
    assert.equal(options.headers.Authorization, "Bearer new");
    return json({ success: true, user });
  };
  const accounts = await Promise.all([currentAccount(), currentAccount()]);
  assert.equal(refreshCount, 1);
  assert.equal(accounts[0].id, "db:42");
  assert.equal(accounts[1].id, "db:42");
  assert.equal(getTokens().refreshToken, "rotated");
});

test("rejected refresh clears authentication without an infinite retry", async () => {
  saveTokens({ accessToken: "old", refreshToken: "expired" });
  let calls = 0;
  let cleared = false;
  const unsubscribe = onSessionCleared(() => { cleared = true; });
  globalThis.fetch = async () => { calls++; return json({ success: false, message: "Expired" }, 401); };
  await assert.rejects(currentAccount(), ApiError);
  assert.equal(calls, 2);
  assert.equal(getTokens(), null);
  assert.equal(cleared, true);
  unsubscribe();
});

test("logout clears local authentication and revokes the backend refresh token", async () => {
  saveTokens({ accessToken: "access", refreshToken: "refresh" });
  data.set("as_shop_v2", "shop records");
  data.set("as_account", "cached profile");
  data.set("as_user", "legacy identity");
  data.set("as_roles", "legacy roles");
  data.set("unrelated-setting", "keep");
  globalThis.fetch = async (url, options) => {
    assert.equal(getTokens(), null);
    assert.equal(url, "/api/user/logout");
    assert.deepEqual(JSON.parse(options.body), { refreshToken: "refresh" });
    return json({ success: true });
  };
  await logout();
  assert.equal(data.has("as_shop_v2"), false);
  assert.equal(data.has("as_account"), false);
  assert.equal(data.has("as_auth_tokens"), false);
  assert.equal(data.has("as_user"), false);
  assert.equal(data.has("as_roles"), false);
  assert.equal(data.get("unrelated-setting"), "keep");
});

test("an in-flight login cannot restore a session after logout", async () => {
  let complete;
  globalThis.fetch = () => new Promise((resolve) => { complete = resolve; });
  const pending = login(user.email, "secret");
  clearSession();
  complete(json(success));
  await assert.rejects(pending, /session has changed/);
  assert.equal(getTokens(), null);
});

test("requests from an old session are never retried with another user's credentials", async () => {
  saveTokens({ accessToken: "first", refreshToken: "first-refresh" });
  let complete;
  let calls = 0;
  globalThis.fetch = () => { calls++; return new Promise((resolve) => { complete = resolve; }); };
  const pending = currentAccount();
  clearSession();
  saveTokens({ accessToken: "second", refreshToken: "second-refresh" });
  complete(json({ success: false }, 401));
  await assert.rejects(pending, ApiError);
  assert.equal(calls, 1);
  assert.equal(getTokens().accessToken, "second");
});

test("network and non-JSON failures produce actionable errors", async () => {
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(login(user.email, "secret"), /Unable to reach the server/);
  globalThis.fetch = async () => new Response("<html>Not found</html>", { status: 404 });
  await assert.rejects(login(user.email, "secret"), /Check the API URL/);
});

test("a refresh that finishes after logout cannot recreate the session", async () => {
  saveTokens({ accessToken: "old", refreshToken: "refresh" });
  let completeRefresh;
  let refreshStarted;
  const started = new Promise((resolve) => { refreshStarted = resolve; });
  globalThis.fetch = async (url) => {
    if (!url.endsWith("/refresh")) return json({ success: false }, 401);
    refreshStarted();
    return new Promise((resolve) => { completeRefresh = resolve; });
  };
  const pending = currentAccount();
  await started;
  clearSession();
  completeRefresh(json(success));
  await assert.rejects(pending, /session has changed/);
  assert.equal(getTokens(), null);
});

test("data arriving after a change of account is discarded", async () => {
  saveTokens({ accessToken: "first", refreshToken: "first-refresh" });
  let complete;
  globalThis.fetch = () => new Promise((resolve) => { complete = resolve; });
  const pending = currentAccount();
  clearSession();
  saveTokens({ accessToken: "second", refreshToken: "second-refresh" });
  complete(json({ success: true, user }));
  await assert.rejects(pending, /session has changed/);
  assert.equal(getTokens().accessToken, "second");
});

test("registration matches the backend add-user route and model without signing in", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/user/add");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.equal(options.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(options.body), {
      first_name: "Alex", last_name: "Rivera", email: "alex@example.com", phone: "",
      driving_license_number: "", passwordHash: registration.password,
      isEmailVerified: false, isPhoneVerified: false, isActive: true,
    });
    return json({ success: true, message: "Account created successfully." }, 201);
  };
  await register({ ...registration, roles: ["ADMIN"], isEmailVerified: true });
  assert.equal(getTokens(), null);
  assert.equal(data.has("as_account"), false);
});

test("duplicate email and registration failures leave authentication empty", async () => {
  globalThis.fetch = async () => json({ success: false, message: "Email already exists." }, 409);
  await assert.rejects(register(registration), { status: 409, message: "Email already exists." });
  assert.equal(getTokens(), null);
  globalThis.fetch = async () => json({ success: true, user: { ...user, roles: ["CUSTOMER"] } }, 201);
  await register(registration);
  assert.equal(getTokens(), null);
});

test("registration completing after sign-out cannot authenticate", async () => {
  let complete;
  globalThis.fetch = () => new Promise((resolve) => { complete = resolve; });
  const pending = register(registration);
  clearSession();
  complete(json(success, 201));
  await assert.rejects(pending, /session has changed/);
  assert.equal(getTokens(), null);
});

test("registration validation allows optional contact details and rejects invalid required fields", () => {
  assert.deepEqual(registrationErrors(registration, registration.password), {});
  const errors = registrationErrors({ ...registration, firstName: " ", lastName: "", email: "invalid", password: "short" }, "different");
  assert.deepEqual(Object.keys(errors).sort(), ["confirmPassword", "email", "firstName", "lastName", "password"]);
  assert.ok(registrationErrors({ ...registration, phone: "123", drivingLicenseNumber: "x".repeat(51) }, registration.password).phone);
  assert.ok(registrationErrors({ ...registration, phone: "123", drivingLicenseNumber: "x".repeat(51) }, registration.password).drivingLicenseNumber);
});

test("password length respects BCrypt's byte limit for Unicode as well as ASCII", () => {
  assert.equal(registrationErrors({ ...registration, password: "a".repeat(72) }, "a".repeat(72)).password, undefined);
  assert.ok(registrationErrors({ ...registration, password: "a".repeat(73) }, "a".repeat(73)).password);
  assert.ok(registrationErrors({ ...registration, password: "😀".repeat(20) }, "😀".repeat(20)).password);
  assert.ok(registrationErrors({ ...registration, password: " ".repeat(8) }, " ".repeat(8)).password);
});

test("logout clears cached user data even if server revocation fails", async () => {
  saveTokens({accessToken: "access", refreshToken: "refresh"});
  data.set("as_account", "profile");
  data.set("as_shop_v2", "shop records");
  globalThis.fetch = async () => {throw new TypeError("offline");};
  await assert.rejects(logout(), /Unable to reach the server/);
  assert.equal(getTokens(), null);
  assert.equal(data.has("as_account"), false);
  assert.equal(data.has("as_shop_v2"), false);
});

test("gateway failures identify backend availability instead of a generic login failure", async () => {
  for (const body of ["", "<html>Bad Gateway</html>"]) {
    globalThis.fetch = async () => new Response(body,{status:502});
    await assert.rejects(login(user.email,"secret"), {status:502,message:"Unable to reach the backend service. Check that the backend is running and the API proxy address is correct."});
    assert.equal(getTokens(),null);
  }
});
