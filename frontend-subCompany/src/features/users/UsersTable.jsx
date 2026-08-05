import UserRow from "./UserRow";

export default function UsersTable({
  users,
  busyUserId,
  onToggle,
  onChangePassword,
  onDelete,
  onEditCoins,
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
      <table className="w-full min-w-[850px] text-sm">
        <thead>
          <tr className="border-b border-(--color-border) bg-slate-50 text-xs uppercase tracking-wider text-gray-500">
            <th className="px-5 py-3 text-left">#</th>
            <th className="px-5 py-3 text-left">User</th>
            <th className="px-5 py-3 text-left">Username</th>
            <th className="px-5 py-3 text-right">Balance</th>
            <th className="px-5 py-3 text-left">Status</th>
            <th className="px-5 py-3 text-left">Actions</th>
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
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
