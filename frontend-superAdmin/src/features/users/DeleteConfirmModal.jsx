import { useState } from "react";
import { deleteUser } from "../../shared/api/userApi";

export default function DeleteConfirmModal({ isOpen, user, onClose, onConfirm, showToast }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteUser(user._id);
      onConfirm(user._id);
      onClose();
      showToast?.(`${user?.firstName} deleted successfully`); // ✅
    } catch {
      showToast?.("Failed to delete user. Please try again.", true); // ✅
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>

        <div>
          <p className="font-bold text-gray-800 text-lg">Delete User</p>
          <p className="text-gray-500 text-sm mt-1">
            Delete{" "}
            <span className="font-semibold text-gray-800">{user?.firstName}</span>
            ? This cannot be undone.
          </p>
        </div>

        <div className="flex gap-3 w-full mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50 transition-all"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
