import { Eye, EyeOff, KeyRound, Save } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import Spinner from "../../components/common/Spinner";
import { updateSuperadminProfile } from "../../services/profileService";

function PasswordInput({ id, label, value, onChange, placeholder, visible, onToggle, disabled }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-(--color-text-dark)">{label}</label>
      <div className="flex items-center rounded-xl border border-(--color-border) bg-slate-50 transition hover:border-(--color-accent) focus-within:border-(--color-banner) focus-within:bg-white focus-within:ring-3 focus-within:ring-blue-100">
        <input id={id} type={visible ? "text" : "password"} value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-(--color-text-dark) outline-none placeholder:text-gray-400 disabled:opacity-60" />
        <button type="button" onClick={onToggle} disabled={disabled} className="mr-2 grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-gray-400 transition hover:bg-blue-50 hover:text-(--color-primary) disabled:cursor-not-allowed" aria-label={visible ? `Hide ${label}` : `Show ${label}`} title={visible ? "Hide password" : "Show password"}>
          {visible ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
        </button>
      </div>
    </div>
  );
}

export default function UpdatePasswordCard() {
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState({ old: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);

  const toggle = (field) => setVisible((current) => ({ ...current, [field]: !current[field] }));

  const handleSubmit = async () => {
    if (!oldPassword) return toast.error("Current password is required.");
    if (!password) return toast.error("New password is required.");
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (password !== confirmPassword) return toast.error("Passwords do not match.");
    if (oldPassword === password) return toast.error("New password must differ from current.");

    setLoading(true);
    try {
      const response = await updateSuperadminProfile({ oldPassword, password, confirmPassword });
      toast.success(response.message ?? "Password updated successfully.");
      setOldPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error?.response?.data?.message ?? "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-gray-100 bg-slate-50 px-5 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-(--color-primary)">
          <KeyRound aria-hidden="true" size={19} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-(--color-text-dark)">Update Password</h2>
          <p className="mt-0.5 text-xs text-gray-400">Keep your account protected</p>
        </div>
      </header>

      <div className="space-y-4 p-5">
        <PasswordInput id="current-password" label="Current password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} placeholder="Enter current password" visible={visible.old} onToggle={() => toggle("old")} disabled={loading} />
        <PasswordInput id="new-password" label="New password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" visible={visible.next} onToggle={() => toggle("next")} disabled={loading} />
        <PasswordInput id="confirm-password" label="Confirm password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter new password" visible={visible.confirm} onToggle={() => toggle("confirm")} disabled={loading} />
        <p className="text-xs leading-5 text-gray-400">Use at least 6 characters and avoid reusing your current password.</p>
        <button type="button" onClick={handleSubmit} disabled={loading || !oldPassword || !password || !confirmPassword} className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-(--color-btn-bg) px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-(--color-btn-hover) disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? <Spinner size={17} variant="neon" label="Password saving" /> : <Save aria-hidden="true" size={17} />}
          {loading ? "Saving..." : "Save Password"}
        </button>
      </div>
    </section>
  );
}
