import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, slugify, useNavigate } from "../router";
import { useApp } from "../store/AppContext";
import { Button, Field, Input } from "../components/ui";
import { IconWrench } from "../components/icons";
import { accountForIdentifier, emailValid } from "../lib/accounts";

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-page">
      <div className="relative hidden w-[44%] overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1000&h=1400&fit=crop&auto=format"
          alt="Car in a modern service center"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/50 to-navy-900/20" />
        <div className="absolute left-10 top-10 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-white">
            <IconWrench size={19} />
          </div>
          <span className="text-lg font-bold text-white">AutoServe</span>
        </div>
        <div className="absolute bottom-14 left-10 right-10">
          <h2 className="text-4xl font-bold leading-tight text-white">
            Your Car,
            <br />
            Our Care.
          </h2>
          <p className="mt-3 max-w-sm text-[15px] text-slate-300">
            Reliable service for every mile. Book, track, and manage repairs from one place.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px] animate-in">{children}</div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, accounts } = useApp();
  const [identifier, setIdentifier] = useState("john@example.com");
  const [error, setError] = useState("");

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const account = accountForIdentifier(accounts, identifier);
    if (!account) {
      setError("We couldn't find an account for that email or phone.");
      return;
    }
    const result = signIn(identifier);
    if (!result.ok) return setError(result.error);
    navigate(`/${slugify(account.name)}/dashboard`);
  };

  return (
    <AuthLayout>
      <h1 className="text-[26px] font-bold text-ink-900">Welcome Back</h1>
      <p className="mt-1 text-sm text-ink-500">Demo sign-in uses an email or phone only. No passwords are checked; use fictional details.</p>

      <form onSubmit={go} className="mt-7 space-y-4">
        <Field label="Email or Phone">
          <Input
            type="text"
            placeholder="john@example.com"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setError("");
            }}
          />
        </Field>
        <Field label="Password">
          <Input type="password" placeholder="Unavailable in demo" disabled autoComplete="off" />
        </Field>

        {error && (
          <div className="rounded-lg bg-bad-50 px-3.5 py-2.5 text-[13px] text-bad-700 ring-1 ring-inset ring-bad-500/20">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between text-[13px]">
          <label className="flex items-center gap-2 text-ink-500">
            <input type="checkbox" className="h-4 w-4 rounded border-line accent-brand-500" disabled title="Demo sessions last for this tab only" />
            Remember me (unavailable)
          </label>
          <Link to="/forgot-password" className="font-medium text-brand-600 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full">Sign In</Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Don't have an account?{" "}
        <Link to="/signup" className="font-semibold text-brand-600 hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}

const OTP_TTL = 120; // seconds
const newCode = () => String(Math.floor(100000 + Math.random() * 900000));

function Alert({ tone, children }: { tone: "ok" | "bad" | "info"; children: ReactNode }) {
  const cls = {
    ok: "bg-ok-50 text-ok-700 ring-ok-500/20",
    bad: "bg-bad-50 text-bad-700 ring-bad-500/20",
    info: "bg-brand-50 text-brand-700 ring-brand-500/20",
  }[tone];
  return <div className={`rounded-lg px-3.5 py-2.5 text-[13px] ring-1 ring-inset ${cls}`}>{children}</div>;
}

function OtpStep({ email, onVerified, onBack }: { email: string; onVerified: () => void; onBack: () => void }) {
  const [code, setCode] = useState(newCode);
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + OTP_TTL * 1000);
  const [now, setNow] = useState(Date.now());
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const left = Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const expired = left === 0;
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
        const next = clean.slice(0, 6).split("");
      setDigits([...next, ...Array(6 - next.length).fill("")]);
      refs.current[Math.min(next.length, 5)]?.focus();
    } else {
      const next = [...digits];
      next[i] = clean;
      setDigits(next);
      if (clean && i < 5) refs.current[i + 1]?.focus();
    }
    setError("");
  };

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    const entered = digits.join("");
    if (entered.length < 6) return setError("Enter all 6 digits of the code.");
    if (expired) return setError("This code has expired. Please request a new one.");
    if (entered !== code) return setError("Incorrect code. Please check and try again.");
    onVerified();
  };

  const resend = () => {
    setCode(newCode());
    setExpiresAt(Date.now() + OTP_TTL * 1000);
    setNow(Date.now());
    setDigits(Array(6).fill(""));
    setError("");
    setNotice(`A new local demo code is ready.`);
    refs.current[0]?.focus();
  };

  return (
    <form onSubmit={verify} className="mt-7 space-y-4">
      <p className="text-sm text-ink-500">
        Demo verification for <span className="font-semibold text-ink-900">{email}</span>. No email is sent.
      </p>
      <Alert tone="info">
        Demo code: <span className="font-mono font-semibold tracking-widest">{code}</span>
      </Alert>

      <div className="flex justify-between gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={6}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus(); }}
            className={`h-12 w-12 rounded-lg border bg-white text-center font-mono text-lg font-semibold text-ink-900 focus:outline-none focus:ring-2 ${
              error ? "border-bad-500 focus:ring-bad-500/15" : "border-line focus:border-brand-500 focus:ring-brand-500/15"
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[13px]">
        <span className={expired ? "font-medium text-bad-700" : "text-ink-500"}>
          {expired ? "Code expired" : <>Code expires in <span className="font-mono font-semibold text-ink-900">{mmss}</span></>}
        </span>
        <button type="button" onClick={resend} className="font-medium text-brand-600 hover:underline disabled:opacity-50">
          Resend code
        </button>
      </div>

      {error && <Alert tone="bad">{error}</Alert>}
      {notice && !error && <Alert tone="ok">{notice}</Alert>}

      <Button type="submit" className="w-full">Verify Code</Button>
      <button type="button" onClick={onBack} className="w-full text-center text-[13px] font-medium text-ink-500 hover:text-ink-900">
        Use a different email
      </button>
    </form>
  );
}

function FieldErr({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-[12px] text-bad-700">{msg}</p> : null;
}

export function SignUpPage() {
  const navigate = useNavigate();
  const { registerCustomer, accounts } = useApp();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form, v: string) => { setForm({ ...form, [k]: v }); setErrors({ ...errors, [k]: "" }); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (form.name.trim().length < 2) er.name = "Enter your full name.";
    if (!emailValid(form.email)) er.email = "Enter a valid email address.";
    else if (accountForIdentifier(accounts, form.email)) er.email = "An account with this email already exists.";
    if (form.phone && form.phone.replace(/\D/g, "").length < 10) er.phone = "Enter a phone number with at least 10 digits.";
    setErrors(er);
    if (Object.values(er).some(Boolean)) return;
    setStep("verify");
  };

  const finish = () => {
    const displayName = form.name.trim();
    const result = registerCustomer(form);
    if (!result.ok) {
      setErrors({ email: result.error });
      setStep("form");
      return;
    }
    navigate(`/${slugify(displayName)}/dashboard`);
  };

  return (
    <AuthLayout>
      <h1 className="text-[26px] font-bold text-ink-900">{step === "form" ? "Create Account" : "Verify Your Email"}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {step === "form" ? "Create a local demo account using fictional contact details." : "Use the displayed demo code. Email verification requires a backend."}
      </p>
      {step === "form" ? (
        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          <Field label="Full Name" required>
            <Input placeholder="John Doe" value={form.name} onChange={(e) => set("name", e.target.value)} />
            <FieldErr msg={errors.name} />
          </Field>
          <Field label="Email" required>
            <Input type="email" placeholder="john@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
            <FieldErr msg={errors.email} />
          </Field>
          <Field label="Phone">
            <Input placeholder="(415) 555-0132" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            <FieldErr msg={errors.phone} />
          </Field>
          <Field label="Password">
            <Input type="password" placeholder="Unavailable in demo" disabled autoComplete="off" />
          </Field>
          <Button type="submit" className="w-full">Create Account</Button>
        </form>
      ) : (
        <OtpStep email={form.email.trim()} onVerified={finish} onBack={() => setStep("form")} />
      )}
      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <h1 className="text-[26px] font-bold text-ink-900">Reset Password</h1>
      <p className="mt-3 text-sm text-ink-500">Password reset is unavailable until authentication and email delivery are connected. Demo sign-in uses an email or phone without a password.</p>
      <div className="mt-7 space-y-4">
        <Field label="Email"><Input type="email" placeholder="Unavailable in demo" disabled /></Field>
        <Button className="w-full" disabled>Send Code</Button>
      </div>
      <p className="mt-6 text-center text-sm"><Link to="/login" className="font-semibold text-brand-600 hover:underline">Back to Sign In</Link></p>
    </AuthLayout>
  );
}
