import { Plus, Search, ShieldCheck, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import AdminConfirmationModal from "./components/AdminConfirmationModal";
import AdminsTable from "./components/AdminsTable";
import ChangeAdminPasswordModal from "./components/ChangeAdminPasswordModal";
import CreateAdminModal from "./components/CreateAdminModal";
import { DEFAULT_AVAILABLE_SHARE } from "./constants/adminFormConstants";
import useAdmins from "./hooks/useAdmins";

export default function AdminsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ field: "username", asc: true });
  const [createOpen, setCreateOpen] = useState(false);
  const [passwordAdmin, setPasswordAdmin] = useState(null);
  const [confirmation, setConfirmation] = useState({ admin: null, action: null });
  const [busyAdminId, setBusyAdminId] = useState(null);

  const showToast = useCallback((message, isError = false) => {
    if (isError) toast.error(message || "Something went wrong");
    else toast.success(message || "Action completed successfully");
  }, []);

  const { admins, loading, totalPages, refresh, changeStatus, removeAdmin } = useAdmins({ page, searchQuery, showToast });

  const sortedAdmins = useMemo(() => [...admins].sort((first, second) => {
    const firstValue = first[sort.field];
    const secondValue = second[sort.field];
    const comparison = typeof firstValue === "number"
      ? firstValue - secondValue
      : String(firstValue ?? "").localeCompare(String(secondValue ?? ""));
    return sort.asc ? comparison : -comparison;
  }), [admins, sort]);

  const applySearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  const handleSort = (field) => setSort((current) =>
    current.field === field ? { field, asc: !current.asc } : { field, asc: true }
  );

  const confirmAction = async () => {
    const { admin, action } = confirmation;
    if (!admin || busyAdminId) return;
    setBusyAdminId(admin._id);
    try {
      const response = action === "delete" ? await removeAdmin(admin) : await changeStatus(admin);
      showToast(response.message);
      setConfirmation({ admin: null, action: null });
      if (action === "delete" && admins.length === 1 && page > 1) setPage((value) => value - 1);
    } catch (error) {
      showToast(error?.response?.data?.message ?? error.message, true);
    } finally {
      setBusyAdminId(null);
    }
  };

  return (
    <div className="min-h-full bg-(--color-bg-main) p-3 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="relative overflow-hidden rounded-2xl bg-(--color-primary) px-5 py-5 text-white shadow-sm sm:px-7 sm:py-6">
          <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="relative flex items-center gap-4"><div className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/10"><ShieldCheck size={22} /></div><div><h1 className="text-xl font-bold sm:text-2xl">Admins</h1><p className="mt-1 text-sm text-(--color-text-muted)">Create and manage administrator accounts.</p></div></div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-(--color-border) p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <form onSubmit={applySearch} className="flex w-full gap-2 sm:max-w-md">
              <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" size={17} /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by username or name..." className="w-full rounded-xl border border-(--color-border) bg-slate-50 py-2.5 pr-9 pl-10 text-sm outline-none focus:border-(--color-banner) focus:bg-white focus:ring-3 focus:ring-blue-100" />{searchInput && <button type="button" onClick={clearSearch} className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-gray-400 hover:bg-gray-100"><X size={15} /></button>}</div>
              <button type="submit" className="rounded-xl border border-(--color-border) px-4 py-2 text-sm font-bold text-(--color-primary) hover:bg-blue-50">Search</button>
            </form>
            <button type="button" onClick={() => setCreateOpen(true)} className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-(--color-btn-bg) px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-(--color-btn-hover)"><Plus size={17} />Create Admin</button>
          </div>

          {searchQuery && <div className="border-b border-gray-100 bg-blue-50/50 px-5 py-2 text-xs text-(--color-primary)">Showing results for <strong>“{searchQuery}”</strong></div>}
          <AdminsTable admins={sortedAdmins} loading={loading} page={page} sort={sort} onSort={handleSort} onStatus={(admin) => setConfirmation({ admin, action: "status" })} onPassword={setPasswordAdmin} onDelete={(admin) => setConfirmation({ admin, action: "delete" })} busyAdminId={busyAdminId} />

          {totalPages > 1 && <div className="flex items-center justify-center gap-2 border-t border-gray-100 px-5 py-4"><button type="button" disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">Previous</button><span className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold text-(--color-primary)">{page} / {totalPages}</span><button type="button" disabled={page === totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">Next</button></div>}
        </section>
      </div>

      <CreateAdminModal open={createOpen} availableShare={DEFAULT_AVAILABLE_SHARE} onClose={() => setCreateOpen(false)} onCreated={refresh} showToast={showToast} />
      <AdminConfirmationModal admin={confirmation.admin} action={confirmation.action} busy={Boolean(busyAdminId)} onClose={() => setConfirmation({ admin: null, action: null })} onConfirm={confirmAction} />
      <ChangeAdminPasswordModal admin={passwordAdmin} onClose={() => setPasswordAdmin(null)} showToast={showToast} />
      <Toaster position="bottom-right" toastOptions={{ style: { borderRadius: "12px", fontSize: "13px", fontWeight: "600" } }} />
    </div>
  );
}
