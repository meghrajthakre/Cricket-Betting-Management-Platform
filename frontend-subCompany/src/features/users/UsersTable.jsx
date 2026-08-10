import UserRow from "./UserRow";

export default function UsersTable({
  users,
  busyUserId,
  onToggle,
  onChangePassword,
  onDelete,
  onEditCoins,
  onLimitUpdated,
  showToast,
  mode = "clients",
}) {
  if (users.length === 0)
    return (
      <div className="flex min-h-72 flex-col items-center justify-center text-center">
        <p className="text-sm font-semibold text-gray-500">No users found</p>
        <p className="mt-1 text-xs text-gray-400">
          Try clearing your search or create a new user.
        </p>
      </div>
    );
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-sm ${mode === "limits" ? "min-w-[900px]" : "min-w-[760px]"}`}>
        <thead>
          <tr className="border-b border-(--color-border) bg-slate-50 text-xs uppercase tracking-wider text-gray-500">
            <th className="border border-gray-200 px-5 py-3 text-left">#</th>
            <th className="border border-gray-200 px-5 py-3 text-left">User</th>
            <th className="border border-gray-200 px-5 py-3 text-left">Username</th>
            {mode === "limits" && <><th className="border border-gray-200 px-5 py-3 text-right">Current Limit</th><th className="border border-gray-200 px-5 py-3 text-right">Used Limit</th><th className="border border-gray-200 px-5 py-3 text-left">Edit Limit</th></>}
            {mode === "clients" && <th className="border border-gray-200 px-5 py-3 text-left">Status</th>}
            {mode === "clients" && <th className="border border-gray-200 px-5 py-3 text-left">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <UserRow
              key={user._id}
              user={user}
              index={index}
              busy={busyUserId === user._id}
              onToggle={onToggle}
              onChangePassword={onChangePassword}
              onDelete={onDelete}
              onEditCoins={onEditCoins}
              onLimitUpdated={onLimitUpdated}
              showToast={showToast}
              mode={mode}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
