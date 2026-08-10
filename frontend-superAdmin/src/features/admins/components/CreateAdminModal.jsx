import { Info, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Field from "../../../shared/components/Field";
import Modal from "../../../shared/components/Modal";
import Spinner from "../../../shared/components/Spinner";
import { createAdmin } from "../api/adminApi";
import { createEmptyAdminForm, inputClassName, readOnlyClassName } from "../constants/adminFormConstants";
import { calculateAdminShare, toCreateAdminPayload, validateAdminForm } from "../utils/adminFormUtils";

export default function CreateAdminModal({ open, availableShare, onClose, onCreated, showToast }) {
  const [form, setForm] = useState(() => createEmptyAdminForm(availableShare));
  const [saving, setSaving] = useState(false);
  const adminShare = useMemo(() => calculateAdminShare(form.masterShare, form.myShare), [form.masterShare, form.myShare]);

  useEffect(() => {
    if (open) setForm(createEmptyAdminForm(availableShare));
  }, [availableShare, open]);

  const change = (field) => (event) => setForm((value) => ({ ...value, [field]: event.target.value }));

  const submit = async () => {
    const error = validateAdminForm(form, adminShare);
    if (error) return showToast(error, true);
    setSaving(true);
    try {
      const response = await createAdmin(toCreateAdminPayload(form));
      showToast(response.message ?? "Admin created successfully");
      onClose();
      onCreated();
    } catch (requestError) {
      showToast(requestError?.response?.data?.message ?? requestError.message, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Create Admin" onClose={saving ? () => {} : onClose}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="First Name"><input className={inputClassName} value={form.firstName} onChange={change("firstName")} placeholder="Enter first name" /></Field></div>
        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-(--color-primary) sm:col-span-2"><Info size={15} />Username will be generated automatically.</div>
        <Field label="Master Share %"><input className={readOnlyClassName} value={form.masterShare} readOnly /></Field>
        <Field label="My Share %"><input className={inputClassName} type="number" min="0" max={form.masterShare} value={form.myShare} onChange={change("myShare")} /></Field>
        <Field label="Admin Share %"><input className={readOnlyClassName} value={adminShare} readOnly /></Field>
        <Field label="Ledger Share"><input className={inputClassName} type="number" min="0" value={form.ledgerShare} onChange={change("ledgerShare")} /></Field>
        <Field label="Fix Limit"><input className={inputClassName} type="number" min="0" value={form.fixLimit} onChange={change("fixLimit")} /></Field><div />
        <Field label="Password"><input className={inputClassName} type="password" value={form.password} onChange={change("password")} placeholder="Minimum 6 characters" /></Field>
        <Field label="Confirm Password"><input className={inputClassName} type="password" value={form.confirmPassword} onChange={change("confirmPassword")} placeholder="Re-enter password" /></Field>
      </div>
      <div className="mt-5 rounded-xl border border-gray-100 bg-slate-50 p-4 text-xs text-gray-500"><div className="flex justify-between"><span>Master Share − My Share</span><strong className={adminShare === "Invalid" ? "text-red-500" : "text-(--color-primary)"}>{adminShare === "" ? "—" : `${adminShare}%`}</strong></div></div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 w-full rounded-xl border border-(--color-border) px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-50 sm:w-auto">Cancel</button><button type="button" onClick={submit} disabled={saving || adminShare === "Invalid"} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-(--color-btn-bg) px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:w-auto">{saving ? <Spinner size={16} variant="neon" /> : <Plus size={16} />}{saving ? "Creating..." : "Create Admin"}</button></div>
    </Modal>
  );
}
