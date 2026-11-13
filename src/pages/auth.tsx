import {clearSession} from "../api/session";
import {apiRequest} from "../api/request";
import { useRef, useState, type ReactNode } from "react";
import { Link, slugify, useNavigate, useLocation } from "../router";
import { useApp } from "../store/AppContext";
import { Button, Field, Input } from "../components/ui";
import { IconWrench } from "../components/icons";
import { emailValid } from "../lib/accounts";
import { registrationErrors, type RegistrationData, type RegistrationErrors } from "../lib/registration";

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
  const { signIn, authError } = useApp();
  const { search } = useLocation();
  const registered = new URLSearchParams(search).get("registered") === "1";
  const reset = new URLSearchParams(search).get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState("");

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    if (!emailValid(email) || !password) return setError("Enter your email address and password.");
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      const result = await signIn(email, password);
      if (!result.ok) return setError(result.error);
      setPassword("");
      navigate(`/${slugify(result.account.name)}/dashboard`, { replace: true });
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-[26px] font-bold text-ink-900">Welcome Back</h1>
      <p className="mt-1 text-sm text-ink-500">Sign in to manage your vehicles and services.</p>

      {reset && <p role="status" className="mt-4 text-sm text-ok-700">Password changed. Please sign in with your new password.</p>}
      {registered && <p role="status" className="mt-4 text-sm text-ok-700">Account created successfully. Please sign in.</p>}
      <form onSubmit={go} className="mt-7 space-y-4">
        <Field label="Email" required>
          <Input
            type="email"
            name="email"
            autoComplete="username"
            required
            disabled={pending}
            placeholder="john@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
          />
        </Field>
        <Field label="Password" required>
          <Input type="password" name="password" placeholder="Enter your password" value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            autoComplete="current-password" required disabled={pending} />
        </Field>

        {(error || authError) && (
          <div role="alert" className="rounded-lg bg-bad-50 px-3.5 py-2.5 text-[13px] text-bad-700 ring-1 ring-inset ring-bad-500/20">
            {error || authError}
          </div>
        )}

        <div className="flex items-center justify-end text-[13px]">
          <Link to="/forgot-password" className="font-medium text-brand-600 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={pending}>{pending ? "Signing In…" : "Sign In"}</Button>
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

export function SignUpPage() {
  const { registerCustomer } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegistrationData>({ firstName: "", lastName: "", email: "", phone: "", drivingLicenseNumber: "", password: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const set = (field: keyof RegistrationData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, ...(field === "password" ? { confirmPassword: undefined } : {}) }));
    setError("");
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    const validation = registrationErrors(form, confirmPassword);
    setErrors(validation);
    setError("");
    if (Object.keys(validation).length) return;
    submitting.current = true;
    setPending(true);
    try {
      const result = await registerCustomer(form);
      if (!result.ok) return setError(result.error);
      setForm((current) => ({ ...current, password: "" }));
      setConfirmPassword("");
      navigate("/login?registered=1", { replace: true });
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  const fieldError = (field: keyof RegistrationErrors) => errors[field]
    ? <p id={`signup-${field}-error`} className="mt-1 text-xs text-bad-700">{errors[field]}</p> : null;
  const describedBy = (field: keyof RegistrationErrors) => errors[field] ? `signup-${field}-error` : undefined;
  return (
    <AuthLayout>
      <h1 className="text-[26px] font-bold text-ink-900">Create Account</h1>
      <p className="mt-1 text-sm text-ink-500">Register to book services and track your repairs.</p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate aria-busy={pending}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First Name" required>
            <Input name="firstName" autoComplete="given-name" required maxLength={50} value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)} disabled={pending} aria-invalid={!!errors.firstName} aria-describedby={describedBy("firstName")} />
            {fieldError("firstName")}
          </Field>
          <Field label="Last Name" required>
            <Input name="lastName" autoComplete="family-name" required maxLength={50} value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)} disabled={pending} aria-invalid={!!errors.lastName} aria-describedby={describedBy("lastName")} />
            {fieldError("lastName")}
          </Field>
        </div>
        <Field label="Email" required>
          <Input name="email" type="email" autoComplete="email" required maxLength={120} value={form.email}
            onChange={(e) => set("email", e.target.value)} disabled={pending} aria-invalid={!!errors.email} aria-describedby={describedBy("email")} />
          {fieldError("email")}
        </Field>
        <Field label="Phone (optional)">
          <Input name="phone" type="tel" autoComplete="tel" maxLength={20} value={form.phone}
            onChange={(e) => set("phone", e.target.value)} disabled={pending} aria-invalid={!!errors.phone} aria-describedby={describedBy("phone")} />
          {fieldError("phone")}
        </Field>
        <Field label="Driving License Number (optional)">
          <Input name="drivingLicenseNumber" maxLength={50} value={form.drivingLicenseNumber}
            onChange={(e) => set("drivingLicenseNumber", e.target.value)} disabled={pending} aria-invalid={!!errors.drivingLicenseNumber} aria-describedby={describedBy("drivingLicenseNumber")} />
          {fieldError("drivingLicenseNumber")}
        </Field>
        <Field label="Password" required>
          <Input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={form.password}
            onChange={(e) => set("password", e.target.value)} disabled={pending} aria-invalid={!!errors.password} aria-describedby={describedBy("password") ?? "signup-password-help"} />
          {fieldError("password")}
          <p id="signup-password-help" className="mt-1 text-xs text-ink-500">Use at least 8 characters.</p>
        </Field>
        <Field label="Confirm Password" required>
          <Input name="confirmPassword" type="password" autoComplete="new-password" required maxLength={72} value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setErrors((current) => ({ ...current, confirmPassword: undefined })); setError(""); }}
            disabled={pending} aria-invalid={!!errors.confirmPassword} aria-describedby={describedBy("confirmPassword")} />
          {fieldError("confirmPassword")}
        </Field>
        {error && <div role="alert" className="rounded-lg bg-bad-50 px-3.5 py-2.5 text-[13px] text-bad-700 ring-1 ring-inset ring-bad-500/20">{error}</div>}
        <Button type="submit" className="w-full" disabled={pending}>{pending ? "Creating Account…" : "Create Account"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link></p>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
 const navigate=useNavigate();
 const [email,setEmail]=useState(""),[pending,setPending]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault();if(!emailValid(email))return setError("Enter a valid email address.");navigate(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);}

 return <AuthLayout><h1 className="text-[26px] font-bold text-ink-900">Forgot password</h1><p className="mt-3 text-sm text-ink-500">Enter your account email to continue to the new-password screen.</p><form onSubmit={submit} className="mt-6 space-y-4"><Field label="Email" required><Input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} maxLength={120}/></Field>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{message&&<p role="status" className="text-sm text-green-700">{message}</p>}<Button type="submit" disabled={pending}>{pending?"Requesting…":"Continue"}</Button></form><p className="mt-6 text-sm"><Link to="/login" className="text-brand-600 underline">Back to login</Link></p></AuthLayout>;
}
export function ResetPasswordPage(){
 const {search}=useLocation(),navigate=useNavigate(),email=new URLSearchParams(search).get("email");
 const [password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[pending,setPending]=useState(false),[error,setError]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault();if(pending)return;if(password!==confirm)return setError("Passwords must match.");if(password.length<8||new TextEncoder().encode(password).length>72||!password.trim())return setError("Use at least 8 characters and at most 72 UTF-8 bytes.");setPending(true);setError("");try{await apiRequest("/user/password/reset",{method:"POST",body:{email,password},authenticated:false});setPassword("");setConfirm("");clearSession();navigate("/login?reset=1",{replace:true});}catch(e){setError(e instanceof Error?e.message:"Unable to reset the password.");}finally{setPending(false);}}
 return <AuthLayout><h1 className="text-[26px] font-bold text-ink-900">Choose a new password</h1>{email?<form onSubmit={submit} className="mt-6 space-y-4"><Field label="New password" required><Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></Field><Field label="Confirm password" required><Input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></Field>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<Button type="submit" disabled={pending}>{pending?"Saving…":"Reset password"}</Button></form>:<p className="mt-5 text-sm text-red-700">Enter your email on the Forgot Password screen first.</p>}<p className="mt-6"><Link to="/forgot-password" className="text-sm text-brand-600 underline">Back to Forgot Password</Link></p></AuthLayout>;
}
