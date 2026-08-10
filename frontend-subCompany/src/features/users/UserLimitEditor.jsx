import { useState } from "react";
import { updateUserFixLimit } from "../../shared/api/userApi";

export default function UserLimitEditor({ user, busy, onUpdated, showToast }) {
  const [limit, setLimit] = useState(String(user.fixLimit ?? 0));
  const [currentLimit, setCurrentLimit] = useState(String(user.coins ?? 0));
  const [saving, setSaving] = useState(false);
  const [remarks, setRemarks] = useState(user.limitRemarks || "");

  const updateLimit = async () => {
    const value = Number(limit);
    const currentValue = Number(currentLimit);
    if (!Number.isFinite(value) || value < 0) return showToast("Valid non-negative limit enter karein", true);
    if (!Number.isFinite(currentValue) || currentValue < 0) return showToast("Valid non-negative current limit enter karein", true);
    if (currentValue > value) return showToast("Current Limit ko Fix Limit se upar nahi rakh sakte. Pehle Fix Limit badhayein.", true);
    if (currentValue < Number(user.usedLimit || 0)) return showToast(`Current Limit used limit ${user.usedLimit || 0} se kam nahi ho sakti`, true);
    if (value === Number(user.fixLimit || 0) && currentValue === Number(user.coins || 0) && remarks === (user.limitRemarks || "")) return showToast("Koi change nahi hai", true);
    setSaving(true);
    try {
      const response = await updateUserFixLimit(user._id, value, currentValue, remarks);
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

  const changeCurrentLimit = (event) => {
    const value = event.target.value;
    if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) setCurrentLimit(value);
  };

  const inputClass = "min-h-10 w-full min-w-32 rounded-lg border border-gray-300 px-3 text-left text-sm tabular-nums outline-none focus:border-(--color-banner) focus:ring-2 focus:ring-blue-100";

  return <>
    <td className="border border-gray-200 px-3 py-2"><input type="text" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" value={limit} onChange={changeLimit} onKeyDown={(event) => { if (["e", "E", "+", "-"].includes(event.key)) event.preventDefault(); }} disabled={busy || saving} className={`${inputClass} font-semibold disabled:bg-gray-100`} aria-label={`Fix limit for ${user.username}`} /></td>
    <td className="border border-gray-200 px-3 py-2"><input type="text" inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" value={currentLimit} onChange={changeCurrentLimit} onKeyDown={(event) => { if (["e", "E", "+", "-"].includes(event.key)) event.preventDefault(); }} disabled={busy || saving} className={`${inputClass} font-semibold text-blue-700 disabled:bg-gray-100`} aria-label={`Current limit for ${user.username}`} /></td>
    <td className="border border-gray-200 px-3 py-2"><input type="text" value={Number(user.usedLimit || 0).toFixed(2)} readOnly className={`${inputClass} cursor-default bg-slate-50 text-amber-600`} aria-label={`Used limit for ${user.username}`} /></td>
    <td className="border border-gray-200 px-3 py-2"><input type="text" value={remarks} onChange={(event) => setRemarks(event.target.value)} maxLength={120} className={inputClass} aria-label={`Remarks for ${user.username}`} /></td>
    <td className="border border-gray-200 px-3 py-2"><button type="button" onClick={updateLimit} disabled={busy || saving} className="min-h-10 rounded-lg bg-(--color-btn-bg) px-4 text-sm font-bold text-white transition hover:bg-(--color-btn-hover) disabled:opacity-50">{saving ? "Saving..." : "Update"}</button></td>
  </>;
}
