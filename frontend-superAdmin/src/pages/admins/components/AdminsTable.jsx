import { Ban, Check, KeyRound, Trash2 } from "lucide-react";
import Spinner from "../../../components/common/Spinner";
import { PAGE_SIZE } from "../constants/adminFormConstants";

function HeaderCell({ label, field, sort, onSort }) {
  return (
    <th onClick={() => field && onSort(field)} className={`whitespace-nowrap border-b border-(--color-border) bg-slate-50 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 ${field ? "cursor-pointer hover:bg-blue-50" : ""}`}>
      {label}{field && <span className="ml-1 text-(--color-banner)">{sort.field === field ? (sort.asc ? "↑" : "↓") : "↕"}</span>}
    </th>
  );
}

export default function AdminsTable({ admins, loading, page, sort, onSort, onStatus, onPassword, onDelete, busyAdminId }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead><tr><HeaderCell label="#" /><HeaderCell label="Username" field="username" sort={sort} onSort={onSort} /><HeaderCell label="Name" field="firstName" sort={sort} onSort={onSort} /><HeaderCell label="Ledger Share" field="ledgerShare" sort={sort} onSort={onSort} /><HeaderCell label="My Share %" field="myShare" sort={sort} onSort={onSort} /><HeaderCell label="Admin Share %" field="downlineShare" sort={sort} onSort={onSort} /><HeaderCell label="Status" field="isActive" sort={sort} onSort={onSort} /><HeaderCell label="Actions" /></tr></thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="8" className="py-14 text-center text-gray-400"><span className="inline-flex items-center gap-2"><Spinner size={20} variant="ocean" />Loading admins...</span></td></tr>
          ) : admins.length === 0 ? (
            <tr><td colSpan="8" className="py-14 text-center text-gray-400">No admins found.</td></tr>
          ) : admins.map((admin, index) => {
            const disabled = busyAdminId === admin._id;
            return (
              <tr key={admin._id} className="border-b border-gray-100 hover:bg-blue-50/30">
                <td className="px-4 py-3 text-center text-gray-400">{(page - 1) * PAGE_SIZE + index + 1}</td>
                <td className="px-4 py-3 font-bold text-(--color-text-dark)">{admin.username?.toUpperCase()}</td>
                <td className="px-4 py-3 text-gray-600">{admin.firstName || "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{Number(admin.ledgerShare ?? 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{Number(admin.myShare ?? 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{Number(admin.downlineShare ?? 0).toFixed(2)}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${admin.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}><span className={`h-1.5 w-1.5 rounded-full ${admin.isActive ? "bg-emerald-500" : "bg-red-500"}`} />{admin.isActive ? "Active" : "Blocked"}</span></td>
                <td className="px-4 py-3"><div className="flex gap-2">
                  <button type="button" disabled={disabled} onClick={() => onStatus(admin)} className={`grid h-8 w-8 place-items-center rounded-lg text-white disabled:opacity-50 ${admin.isActive ? "bg-amber-500" : "bg-emerald-500"}`} title={admin.isActive ? "Block admin" : "Unblock admin"}>{admin.isActive ? <Ban size={14} /> : <Check size={14} />}</button>
                  <button type="button" disabled={disabled} onClick={() => onPassword(admin)} className="grid h-8 w-8 place-items-center rounded-lg bg-(--color-btn-bg) text-white disabled:opacity-50" title="Change password"><KeyRound size={14} /></button>
                  <button type="button" disabled={disabled} onClick={() => onDelete(admin)} className="grid h-8 w-8 place-items-center rounded-lg bg-red-500 text-white disabled:opacity-50" title="Delete admin"><Trash2 size={14} /></button>
                </div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
