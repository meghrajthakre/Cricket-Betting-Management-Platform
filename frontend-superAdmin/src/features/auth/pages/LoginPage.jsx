import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Spinner from "../../../shared/components/Spinner";
import { loginUser } from "../../../shared/api/userApi";

const FEATURES = [
  "Secure administrative access",
  "Manage users, admins and matches",
  "Monitor reports from one dashboard",
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.username.trim()) nextErrors.username = "Username is required";
    if (!form.password) nextErrors.password = "Password is required";
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await loginUser(form.username, form.password);
      navigate("/superadmin/dashboard", { replace: true });
    } catch (error) {
      const data = error.response?.data;
      if (data?.errors && typeof data.errors === "object") {
        setErrors(data.errors);
      } else {
        setErrors({ form: data?.message || "Invalid username or password" });
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClassName = (hasError) => `
    w-full rounded-xl border bg-(--color-input-bg) py-3 pl-11 pr-4 text-sm
    text-(--color-text-dark) outline-none transition-all placeholder:text-slate-400
    ${hasError
      ? "border-(--color-error) ring-3 ring-red-100"
      : "border-(--color-border) focus:border-(--color-banner) focus:ring-3 focus:ring-blue-100"}
  `;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-(--color-bg-main) px-4 py-8 sm:px-6">
      <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-(--color-accent) opacity-25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-(--color-banner) opacity-15 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_24px_70px_rgba(30,58,95,0.18)] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-(--color-primary) p-10 text-white lg:flex">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full border-[42px] border-white/5" />
          <div className="absolute -bottom-28 -left-28 h-72 w-72 rounded-full border-[48px] border-white/5" />

          <div className="relative flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/12 ring-1 ring-white/20">
              <ShieldCheck size={25} strokeWidth={2.2} />
            </span>
            <div>
              <p className="text-xl font-extrabold tracking-wide">Sonu7777</p>
              <p className="text-xs font-medium text-white/55">Super Admin Console</p>
            </div>
          </div>

          <div className="relative">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-(--color-accent)">
              Control center
            </p>
            <h1 className="max-w-md text-4xl font-extrabold leading-tight">
              Everything you need to run your platform.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
              Sign in to access your secure workspace and manage daily operations.
            </p>

            <div className="mt-9 space-y-4">
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-sm font-medium text-white/80">
                  <CheckCircle2 size={18} className="text-(--color-accent)" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs text-white/35">Protected super-admin workspace</p>
        </section>

        <section className="flex min-h-[590px] items-center px-6 py-10 sm:px-12 lg:min-h-[620px] lg:px-16">
          <div className="mx-auto w-full max-w-md animate-fade-up">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-(--color-primary) text-white shadow-lg shadow-blue-950/15">
                <ShieldCheck size={24} />
              </span>
              <div>
                <p className="text-lg font-extrabold text-(--color-primary)">Sonu7777</p>
                <p className="text-xs text-slate-500">Super Admin Console</p>
              </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--color-banner)">Welcome back</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-(--color-text-dark)">Sign in to your account</h2>
            <p className="mt-2 text-sm text-slate-500">Enter your super-admin credentials to continue.</p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
              {errors.form && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-(--color-error)">
                  {errors.form}
                </div>
              )}

              <div>
                <label htmlFor="username" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Username
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    id="username"
                    type="text"
                    value={form.username}
                    onChange={(event) => setField("username", event.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="Enter your username"
                    aria-invalid={Boolean(errors.username)}
                    className={inputClassName(errors.username)}
                  />
                </div>
                {errors.username && <p className="mt-1.5 text-xs font-medium text-(--color-error)">{errors.username}</p>}
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(event) => setField("password", event.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    aria-invalid={Boolean(errors.password)}
                    className={`${inputClassName(errors.password)} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-(--color-primary)"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs font-medium text-(--color-error)">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-(--color-primary) px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/15 transition hover:bg-(--color-primary-light) hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <Spinner size={19} variant="ocean" label="Signing in" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in securely
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-slate-400">
              © 2026 Sonu7777. Authorized access only.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
