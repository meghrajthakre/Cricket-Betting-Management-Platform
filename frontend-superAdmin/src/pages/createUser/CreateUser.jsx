import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import Spinner from "../../components/common/Spinner";
import { createUser } from "../../services/userService";
import { creditWallet } from "../../services/walletService";

const EMPTY_FORM = { firstName: "", password: "", confirmPassword: "", coins: "" };
const inputClassName = "w-full rounded-xl border border-(--color-border) bg-slate-50 px-4 py-2.5 text-sm text-(--color-text-dark) outline-none transition focus:border-(--color-banner) focus:bg-white focus:ring-3 focus:ring-blue-100";

export default function CreateUser({ onCancel, onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const change = (event) => {
    setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    const coins = Number(form.coins);
    if (!form.firstName.trim()) return setError("Full name is required.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    if (!Number.isFinite(coins) || coins < 0) return setError("Enter a valid non-negative balance.");

    setLoading(true);
    try {
      const response = await createUser({ firstName: form.firstName.trim(), password: form.password, confirmPassword: form.confirmPassword, coins: 0 });
      if (coins > 0) await creditWallet(response.data._id, coins);
      toast.success("User created successfully");
      setForm(EMPTY_FORM);
      onSuccess();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.response?.data?.error || "Could not create user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-(--color-primary)">Username will be generated automatically after user creation.</div>
      <div><label htmlFor="user-name" className="mb-2 block text-sm font-semibold text-(--color-text-dark)">Full name</label><input id="user-name" name="firstName" value={form.firstName} onChange={change} className={inputClassName} placeholder="Enter full name" autoFocus /></div>
      <div><label htmlFor="initial-balance" className="mb-2 block text-sm font-semibold text-(--color-text-dark)">Initial balance</label><input id="initial-balance" name="coins" type="number" min="0" step="0.01" value={form.coins} onChange={change} className={inputClassName} placeholder="0.00" /><p className="mt-1.5 text-xs text-gray-400">Enter 0 if no opening balance is required.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="user-password" className="mb-2 block text-sm font-semibold text-(--color-text-dark)">Password</label><div className="relative"><input id="user-password" name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={change} className={`${inputClassName} pr-11`} placeholder="Minimum 6 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center text-gray-400" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
        <div><label htmlFor="confirm-user-password" className="mb-2 block text-sm font-semibold text-(--color-text-dark)">Confirm password</label><input id="confirm-user-password" name="confirmPassword" type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={change} className={inputClassName} placeholder="Re-enter password" /></div>
      </div>
      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}
      <div className="flex justify-end gap-3 border-t border-gray-100 pt-5"><button type="button" onClick={onCancel} disabled={loading} className="rounded-xl border border-(--color-border) px-4 py-2.5 text-sm font-semibold text-gray-600">Cancel</button><button type="submit" disabled={loading} className="flex items-center gap-2 rounded-xl bg-(--color-btn-bg) px-5 py-2.5 text-sm font-bold text-white hover:bg-(--color-btn-hover) disabled:opacity-50">{loading ? <Spinner size={16} variant="neon" /> : <UserPlus size={17} />}{loading ? "Creating..." : "Create User"}</button></div>
    </form>
  );
}
