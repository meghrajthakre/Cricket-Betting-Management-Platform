import { Ban, Check, Trash2 } from "lucide-react";
import Modal from "../../../shared/components/Modal";

export default function AdminConfirmationModal({ admin, action, busy, onClose, onConfirm }) {
  if (!admin || !action) return null;
  const deleting = action === "delete";
  const blocking = !deleting && admin.isActive;
  const verb = deleting ? "delete" : blocking ? "block" : "unblock";

  return (
    <Modal open title={deleting ? "Delete Admin" : "Confirm Status Change"} onClose={onClose}>
      <p className="text-sm leading-6 text-gray-600">Are you sure you want to <strong>{verb}</strong> <strong>{admin.username?.toUpperCase()}</strong>?</p>
      {deleting && <p className="mt-2 text-sm text-red-500">This action cannot be undone.</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-(--color-border) px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-50">Cancel</button>
        <button type="button" onClick={onConfirm} disabled={busy} className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${deleting || blocking ? "bg-red-500" : "bg-emerald-500"}`}>
          {deleting ? <Trash2 size={16} /> : blocking ? <Ban size={16} /> : <Check size={16} />}{busy ? "Please wait..." : `${verb.charAt(0).toUpperCase()}${verb.slice(1)}`}
        </button>
      </div>
    </Modal>
  );
}
