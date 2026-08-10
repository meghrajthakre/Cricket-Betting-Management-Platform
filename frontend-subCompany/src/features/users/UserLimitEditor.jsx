import { useState } from "react";
import { updateUserBalance } from "../../shared/api/userApi";

export default function UserLimitEditor({ user, busy, onUpdated, showToast }) {
  const [limit, setLimit] = useState(String(user.coins ?? 0));
  const [saving, setSaving] = useState(false);

  const updateLimit = async () => {
    const value = Number(limit);
    if (!Number.isFinite(value) || value < 0) return showToast("Valid non-negative limit enter karein", true);
    if (value === Number(user.coins || 0)) return showToast("Limit mein koi change nahi hai", true);
    setSaving(true);
    try {
      const response = await updateUserBalance(user._id, value);
      onUpdated(user._id, value, response?.data);
      showToast(`${user.username.toUpperCase()} limit updated successfully`);
    } catch (error) {
      showToast(error?.response?.data?.message || error?.response?.data?.error || "Limit update nahi hui", true);
    } finally {
      setSaving(false);
    }
  };

  const changeLimit = (event) => {
    const value = event.target.value;
    if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) setLimit(value);
  };

  return (
    <div className="flex min-w-52 items-center gap-2">
      <input type="text" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" value={limit} onChange={changeLimit} onKeyDown={(event) => { if (["e", "E", "+", "-"].includes(event.key)) event.preventDefault(); }} disabled={busy || saving} className="min-h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-left text-sm font-semibold tabular-nums outline-none focus:border-(--color-banner) focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100" aria-label={`Limit for ${user.username}`} />
      <button type="button" onClick={updateLimit} disabled={busy || saving} className="min-h-10 rounded-lg bg-(--color-btn-bg) px-3 text-xs font-bold text-white transition hover:bg-(--color-btn-hover) disabled:opacity-50">{saving ? "Saving..." : "Update"}</button>
    </div>
  );
}
