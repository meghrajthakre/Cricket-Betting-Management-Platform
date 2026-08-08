import { UserCheck, UserX } from "lucide-react";
import Modal from "../../shared/components/Modal";

export default function UserStatusConfirmationModal({ user, busy, onClose, onConfirm }) {
  if (!user) return null;
  const blocking = user.isActive;
  return (
    <Modal open title={blocking ? "Block User" : "Activate User"} onClose={busy ? () => {} : onClose}>
      <div className={`rounded-xl border p-4 ${blocking ? "border-red-100 bg-red-50" : "border-emerald-100 bg-emerald-50"}`}>
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${blocking ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
            {blocking ? <UserX size={20} /> : <UserCheck size={20} />}
          </div>
          <div><p className="text-sm font-semibold text-gray-800">{blocking ? "Is user ko block karna hai?" : "Is user ko activate karna hai?"}</p><p className="mt-1 text-xs text-gray-500"><strong>{user.firstName}</strong> ({user.username?.toUpperCase()}) {blocking ? "block hone ke baad login nahi kar payega." : "dobara login kar payega."}</p></div>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-(--color-border) px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-50">Cancel</button><button type="button" disabled={busy} onClick={onConfirm} className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${blocking ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>{blocking ? <UserX size={16} /> : <UserCheck size={16} />}{busy ? "Please wait..." : blocking ? "Block User" : "Activate User"}</button></div>
    </Modal>
  );
}
