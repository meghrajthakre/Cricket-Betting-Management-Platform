import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Spinner from "../../../shared/components/Spinner";
import { loginUser } from "../../../shared/api/userApi";

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.username.trim()) nextErrors.username = "Username is required";
    if (!form.password) nextErrors.password = "Password is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await loginUser(form.username, form.password);
      navigate("/superadmin/dashboard", { replace: true });
    } catch (error) {
      const data = error.response?.data;
      setErrors(data?.errors && typeof data.errors === "object"
        ? data.errors
        : { form: data?.message || "Invalid username or password" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) => `
    w-full rounded-md border bg-black/35 py-3.5 pl-12 pr-4 text-sm text-white
    outline-none backdrop-blur-md transition placeholder:text-white/35
    ${hasError
      ? "border-red-400/70 ring-2 ring-red-400/15"
      : "border-white/20 hover:border-white/35 focus:border-[#90b4d4] focus:bg-black/45 focus:ring-2 focus:ring-[#4b75b8]/30"}
  `;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a1422] px-4 py-10 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,#4b75b8_0%,#1e3a5f_30%,#101f33_60%,#0a1422_84%)]" />
        <div className="absolute -left-[10%] top-[18%] h-[28rem] w-[60%] -rotate-12 rounded-[50%] bg-[#4b75b8]/18 blur-[90px]" />
        <div className="absolute -right-[15%] bottom-[-18%] h-[32rem] w-[70%] rotate-6 rounded-[50%] bg-[#2e5080]/30 blur-[100px]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
      </div>

      <section className="relative w-full max-w-[430px] animate-fade-up">
        <header className="mb-9 text-center">
          <div className="mx-auto mb-4 flex items-center justify-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#d6e4f5] to-[#4b75b8] shadow-[0_0_32px_rgba(75,117,184,.45)]">
              <ShieldCheck size={24} strokeWidth={2.4} />
            </span>
            <span className="text-2xl font-black tracking-[-0.04em]">
              SONU<span className="font-medium text-[#90b4d4]">7777</span>
            </span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/45">Super Admin Portal</p>
        </header>

        <div className="rounded-2xl border border-white/10 bg-black/25 px-6 py-8 shadow-[0_30px_80px_rgba(0,0,0,.45)] backdrop-blur-xl sm:px-9 sm:py-10">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Sign In</h1>
            <p className="mt-2 text-sm text-white/55">Enter your credentials to continue</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            {errors.form && (
              <div role="alert" className="rounded-md border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
                {errors.form}
              </div>
            )}

            <div>
              <label htmlFor="username" className="mb-2 block text-xs font-semibold text-white/70">Username</label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={18} />
                <input id="username" type="text" value={form.username} onChange={(event) => setField("username", event.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" placeholder="Enter username" aria-invalid={Boolean(errors.username)} className={inputClass(errors.username)} />
              </div>
              {errors.username && <p className="mt-1.5 text-xs font-medium text-red-300">{errors.username}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-xs font-semibold text-white/70">Password</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={18} />
                <input id="password" type={showPassword ? "text" : "password"} value={form.password} onChange={(event) => setField("password", event.target.value)} autoComplete="current-password" placeholder="Enter password" aria-invalid={Boolean(errors.password)} className={`${inputClass(errors.password)} pr-12`} />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 text-white/35 transition hover:bg-white/10 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs font-medium text-red-300">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#2e5080] via-[#4b75b8] to-[#1e3a5f] px-4 py-3.5 text-xs font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_10px_30px_rgba(46,80,128,.4)] transition hover:brightness-115 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? (
                <><Spinner size={19} variant="neon" label="Signing in" /> Signing in...</>
              ) : (
                <>Sign In <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></>
              )}
            </button>
          </form>

          <div className="mt-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">
            <span className="h-px flex-1 bg-white/10" /> Secure access <span className="h-px flex-1 bg-white/10" />
          </div>
        </div>

        <p className="mt-7 text-center text-[11px] text-white/30">© 2026 Sonu7777 · Authorized access only</p>
      </section>
    </main>
  );
}
