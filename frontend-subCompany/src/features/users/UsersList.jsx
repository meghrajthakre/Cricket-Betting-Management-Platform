import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { getLimitSummary, getUsers, toggleUserStatus } from "../../shared/api/userApi";
import ChangePasswordModal from "./ChangePasswordModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import EditCoinsModal from "./EditCoinsModal";
import SearchBar from "./SearchBar";
import UsersTable from "./UsersTable";
import UsersTableSkeleton from "./UsersTableSkeleton";
import UserStatusConfirmationModal from "./UserStatusConfirmationModal";

export default function UsersList({ onGoCreate, refreshKey, mode = "clients" }) {
  const limitsOnly = mode === "limits";
  const blockedOnly = mode === "blocked";
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyUserId, setBusyUserId] = useState(null);
  const [passwordUser, setPasswordUser] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [balanceUser, setBalanceUser] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [limitSummary, setLimitSummary] = useState(null);
  const [statusUser, setStatusUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const [response, summaryResponse] = await Promise.all([
          getUsers({ search: searchQuery }, controller.signal),
          getLimitSummary(controller.signal),
        ]);
        if (!controller.signal.aborted) {
          setUsers(Array.isArray(response.data) ? response.data : []);
          setLimitSummary(summaryResponse?.data || null);
        }
      } catch (requestError) {
        if (requestError.code === "ERR_CANCELED" || controller.signal.aborted)
          return;
        setError(
          requestError?.response?.data?.message || "Users could not be loaded.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadUsers();
    return () => controller.abort();
  }, [refreshKey, reloadKey, searchQuery]);

  const showToast = useCallback(
    (message, isError = false) =>
      isError ? toast.error(message) : toast.success(message),
    [],
  );

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.isActive).length,
      blocked: users.filter((user) => !user.isActive).length,
      balance: users.reduce((sum, user) => sum + Number(user.coins || 0), 0),
    }),
    [users],
  );

  const applySearch = () => setSearchQuery(searchInput.trim());
  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  const handleToggle = async (id) => {
    const user = users.find((item) => item._id === id);
    if (user) setStatusUser(user);
  };

  const confirmToggle = async () => {
    if (!statusUser) return;
    const user = statusUser;
    setBusyUserId(user._id);
    try {
      await toggleUserStatus(user._id);
      setUsers((items) =>
        items.map((item) =>
          item._id === user._id ? { ...item, isActive: !item.isActive } : item,
        ),
      );
      toast.success(
        `User ${user.isActive ? "blocked" : "activated"} successfully`,
      );
      setStatusUser(null);
    } catch (requestError) {
      toast.error(
        requestError?.response?.data?.message ||
          "Failed to update user status.",
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const summaryItems = [
    { label: "Total Limit", value: Number(limitSummary?.fixLimit || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }) },
    { label: "Used Limit", value: Number(limitSummary?.usedLimit || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }) },
    { label: "Total Users", value: stats.total },
    { label: "Active Users", value: stats.active },
    { label: "Blocked Users", value: stats.blocked },
    { label: "Total Current", value: stats.balance.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
  ];
  const visibleUsers = blockedOnly ? users.filter((user) => !user.isActive) : users;

  return (
    <div className="min-h-full bg-(--color-bg-main) p-3 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-(--color-primary) sm:text-2xl">{limitsOnly ? "Commission & Limits" : blockedOnly ? "Blocked Clients" : "My Clients"}</h1>
          <p className="hidden">
            Used Limit: <span className="font-bold text-amber-600 tabular-nums">{loading ? "—" : Number(limitSummary?.usedLimit || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-2 sm:grid-cols-3 xl:grid-cols-6">
          {summaryItems.map((card) => (
            <div
              key={card.label}
              className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-slate-500">{card.label}</p>
                <p className="mt-1 min-h-6 truncate text-lg font-semibold text-slate-800 tabular-nums">
                  {loading ? <span className="block h-5 w-16 animate-pulse rounded bg-slate-200" /> : card.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <SearchBar
            search={searchInput}
            onSearchChange={setSearchInput}
            onSearch={applySearch}
            onClear={clearSearch}
            loading={loading}
            onCreate={limitsOnly || blockedOnly ? undefined : onGoCreate}
          />
          {searchQuery && (
            <div className="border-b border-gray-100 bg-blue-50/50 px-5 py-2 text-xs text-(--color-primary)">
              Results for <strong>“{searchQuery}”</strong>
            </div>
          )}
          {error ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm font-semibold text-red-500">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="rounded-xl bg-(--color-btn-bg) px-4 py-2 text-sm font-bold text-white"
              >
                Try Again
              </button>
            </div>
          ) : loading ? (
            <UsersTableSkeleton mode={limitsOnly ? "limits" : "clients"} />
          ) : (
            <UsersTable
              users={visibleUsers}
              loading={Boolean(busyUserId)}
              busyUserId={busyUserId}
              onToggle={handleToggle}
              onChangePassword={setPasswordUser}
              onDelete={setDeleteUser}
              onEditCoins={setBalanceUser}
              onLimitUpdated={(id, fixLimit, allocation) => {
                setUsers((items) => items.map((item) => item._id === id ? { ...item, fixLimit, coins: allocation?.currentLimit ?? item.coins, limitRemarks: allocation?.limitRemarks ?? item.limitRemarks } : item));
                if (allocation) setLimitSummary((summary) => summary ? {
                  ...summary,
                  usedLimit: allocation.totalAllocated,
                  remainingLimit: allocation.remainingLimit,
                } : summary);
              }}
              showToast={showToast}
              mode={limitsOnly ? "limits" : "clients"}
            />
          )}
        </section>
      </div>

      <ChangePasswordModal
        isOpen={Boolean(passwordUser)}
        user={passwordUser}
        onClose={() => setPasswordUser(null)}
        onSuccess={() => setPasswordUser(null)}
        showToast={showToast}
      />
      <DeleteConfirmModal
        isOpen={Boolean(deleteUser)}
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={(id) =>
          setUsers((items) => {
            const removed = items.find((item) => item._id === id);
            if (removed) setLimitSummary((summary) => summary ? {
              ...summary,
              usedLimit: Math.max(0, Number(summary.usedLimit || 0) - Number(removed.fixLimit || 0)),
              remainingLimit: Math.max(0, Number(summary.fixLimit || 0) - (Number(summary.usedLimit || 0) - Number(removed.fixLimit || 0))),
            } : summary);
            return items.filter((item) => item._id !== id);
          })
        }
        showToast={showToast}
      />
      <EditCoinsModal
        key={balanceUser?._id || "no-balance-user"}
        isOpen={Boolean(balanceUser)}
        user={balanceUser}
        onClose={() => setBalanceUser(null)}
        onSuccess={(id, coins) => setUsers((items) => {
          return items.map((item) => (item._id === id ? { ...item, coins } : item));
        })}
        showToast={showToast}
      />
      <UserStatusConfirmationModal
        user={statusUser}
        busy={Boolean(busyUserId)}
        onClose={() => setStatusUser(null)}
        onConfirm={confirmToggle}
      />
      <Toaster position="bottom-right" />
    </div>
  );
}
