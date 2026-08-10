import ActionButtons from "./ActionButtons";
import UserLimitEditor from "./UserLimitEditor";

export default function UserRow({
  user,
  index,
  busy,
  onToggle,
  onChangePassword,
  onDelete,
  onEditCoins,
  onLimitUpdated,
  showToast,
  mode = "clients",
}) {
  return (
    <tr className="border-b border-gray-100 transition hover:bg-blue-50/30">
      <td className="border border-gray-200 px-5 py-3 text-gray-400">{index + 1}</td>
      <td className="border border-gray-200 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-(--color-primary) text-sm font-bold text-white">
            {user.firstName?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <span className="font-semibold text-(--color-text-dark)">
            {user.firstName || "—"}
          </span>
        </div>
      </td>
      <td className="border border-gray-200 px-5 py-3">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-gray-600">
          {user.username}
        </span>
      </td>
      {mode === "limits" && <><td className="border border-gray-200 px-5 py-3 text-right font-bold tabular-nums text-(--color-text-dark)">
        {Number(user.coins ?? 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </td>
      <td className="border border-gray-200 px-5 py-3 text-right font-semibold text-amber-600 tabular-nums">
        {Number(user.usedLimit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="border border-gray-200 px-3 py-2">
        <UserLimitEditor key={`${user._id}-${user.coins}`} user={user} busy={busy} onUpdated={onLimitUpdated} showToast={showToast} />
      </td></>}
      {mode === "clients" && <><td className="border border-gray-200 px-5 py-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-red-500"}`}
          />
          {user.isActive ? "Active" : "Blocked"}
        </span>
      </td>
      <td className="border border-gray-200 px-5 py-3">
        <ActionButtons
          user={user}
          busy={busy}
          onToggle={onToggle}
          onChangePassword={onChangePassword}
          onDelete={onDelete}
          onEditCoins={onEditCoins}
          clientOnly
        />
      </td></>}
    </tr>
  );
}
