import { KeyRound, Landmark, Trash2, UserCheck, UserX } from "lucide-react";

export default function ActionButtons({
  user,
  busy,
  onToggle,
  onChangePassword,
  onDelete,
  onEditCoins,
}) {
  const buttonClass =
    "grid h-8 w-8 place-items-center rounded-lg text-white transition disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => onEditCoins(user)}
        className={`${buttonClass} bg-amber-500`}
        title="Manage balance"
        aria-label="Manage balance"
      >
        <Landmark size={14} />
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onToggle(user._id)}
        className={`${buttonClass} ${user.isActive ? "bg-orange-500" : "bg-emerald-500"}`}
        title={user.isActive ? "Block user" : "Activate user"}
        aria-label={user.isActive ? "Block user" : "Activate user"}
      >
        {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onChangePassword(user)}
        className={`${buttonClass} bg-(--color-btn-bg)`}
        title="Change password"
        aria-label="Change password"
      >
        <KeyRound size={14} />
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onDelete(user)}
        className={`${buttonClass} bg-red-500`}
        title="Delete user"
        aria-label="Delete user"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
