import { useState } from "react";
import { changeOwnPassword } from "../../../shared/api/userService";

const initialForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function PasswordPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const change = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError(""); setSuccess("");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (form.newPassword.length < 6) return setError("New password minimum 6 characters hona chahiye.");
    if (form.newPassword !== form.confirmPassword) return setError("New passwords match nahi hain.");
    if (form.currentPassword === form.newPassword) return setError("New password current password se different hona chahiye.");
    setLoading(true); setError(""); setSuccess("");
    try {
      const response = await changeOwnPassword(form.currentPassword, form.newPassword, form.confirmPassword);
      setSuccess(response.message || "Password changed successfully.");
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Password change nahi hua.");
    } finally { setLoading(false); }
  };

  const inputClass = "w-full rounded-xl border border-(--color-border) bg-(--color-input-bg) px-4 py-2.5 text-(--color-text-dark) outline-none focus:border-(--color-accent) focus:ring-2 focus:ring-blue-100";
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-(--color-bg-main) p-4">
      <div className="w-full max-w-md rounded-2xl border border-(--color-border) bg-white p-6 shadow-lg">
        <h1 className="mb-1 text-center text-2xl font-bold text-(--color-primary)">Change Password</h1>
        <p className="mb-6 text-center text-sm text-gray-400">Apne account ke liye strong password set karein.</p>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold text-(--color-text-dark)">Current Password<input autoComplete="current-password" className={`${inputClass} mt-1.5`} type="password" name="currentPassword" value={form.currentPassword} onChange={change} required /></label>
          <label className="block text-sm font-semibold text-(--color-text-dark)">New Password<input autoComplete="new-password" className={`${inputClass} mt-1.5`} type="password" name="newPassword" value={form.newPassword} onChange={change} minLength={6} required /></label>
          <label className="block text-sm font-semibold text-(--color-text-dark)">Confirm New Password<input autoComplete="new-password" className={`${inputClass} mt-1.5`} type="password" name="confirmPassword" value={form.confirmPassword} onChange={change} minLength={6} required /></label>
          {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}
          {success && <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{success}</div>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-(--color-btn-bg) py-3 font-bold text-white transition hover:bg-(--color-btn-hover) disabled:opacity-50">{loading ? "Changing..." : "Change Password"}</button>
        </form>
      </div>
    </main>
  );
}
