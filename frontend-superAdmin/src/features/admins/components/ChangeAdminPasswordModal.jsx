import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal";
import Spinner from "../../../shared/components/Spinner";
import { changeAdminPassword } from "../api/adminApi";
import { inputClassName } from "../constants/adminFormConstants";

export default function ChangeAdminPasswordModal({ admin, onClose, showToast }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (admin) { setPassword(""); setConfirmPassword(""); }
  }, [admin]);

  const submit = async () => {
    if (password.length < 6) return showToast("Password must be at least 6 characters", true);
    if (password !== confirmPassword) return showToast("Passwords do not match", true);
    setSaving(true);
    try {
      const response = await changeAdminPassword(admin._id, password, confirmPassword);
      showToast(response.message ?? "Password updated successfully");
      onClose();
    } catch (error) {
      showToast(error?.response?.data?.message ?? error.message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={Boolean(admin)} title="Change Admin Password" onClose={saving ? () => {} : onClose}>
      <p className="mb-4 text-sm text-gray-500">Updating password for <strong>{admin?.username?.toUpperCase()}</strong></p>
      <div className="space-y-4"><input className={inputClassName} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" /><input className={inputClassName} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" /></div>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-(--color-border) px-4 py-2.5 text-sm font-semibold text-gray-600">Cancel</button><button type="button" onClick={submit} disabled={saving || !password || !confirmPassword} className="flex items-center gap-2 rounded-xl bg-(--color-btn-bg) px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? <Spinner size={16} variant="neon" /> : <Save size={16} />}{saving ? "Saving..." : "Save Password"}</button></div>
    </Modal>
  );
}
