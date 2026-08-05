import { useState } from "react";
import { Building2, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { login } from "../../shared/api/authApi";
import Spinner from "../../shared/components/Spinner";

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await login(form.username, form.password);
      if (response?.data?.user?.role !== "sub_company")
        throw new Error("This login is only for Sub Company accounts.");
      navigate("/sub-company/dashboard", { replace: true });
    } catch (requestError) {
      sessionStorage.removeItem("accessToken");
      setError(
        requestError?.response?.data?.message ||
          requestError.message ||
          "Login failed",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#4B75B8_0%,#1E3A5F_38%,#0a1422_100%)] p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-7 text-white shadow-2xl backdrop-blur-xl sm:p-9"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
          <Building2 size={28} />
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold">
          Sub Company Login
        </h1>
        <p className="mt-1 text-center text-sm text-white/55">
          Sign in to manage your company panel
        </p>
        {error && (
          <div className="mt-5 rounded-xl border border-red-300/25 bg-red-500/15 p-3 text-sm text-red-100">
            {error}
          </div>
        )}
        <div className="mt-6 space-y-4">
          <input
            value={form.username}
            onChange={(event) =>
              setForm((value) => ({ ...value, username: event.target.value }))
            }
            placeholder="Username"
            className="w-full rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-sm outline-none transition placeholder:text-white/35 focus:border-(--color-accent)"
          />
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((value) => ({ ...value, password: event.target.value }))
            }
            placeholder="Password"
            className="w-full rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-sm outline-none transition placeholder:text-white/35 focus:border-(--color-accent)"
          />
        </div>
        <button
          disabled={loading || !form.username || !form.password}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-(--color-banner) px-4 py-3 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-[#5a84c7] disabled:opacity-50"
        >
          {loading ? <Spinner size={17} /> : <LogIn size={17} />}
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
