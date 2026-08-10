export default function UsersTableSkeleton({ mode = "clients" }) {
  const headers = mode === "limits"
    ? ["ID", "Client Name", "Fix Limit", "Current Limit", "Used Limit", "Remarks/Narration", "Action"]
    : ["ID", "Client Name", "Username", "Fix Limit", "Current Limit", "Status", "Actions"];

  return (
    <div className="overflow-x-auto" aria-label="Loading clients" aria-busy="true">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead><tr className="bg-slate-50">{headers.map((header) => <th key={header} className="border border-gray-200 px-5 py-3 text-left text-xs uppercase text-gray-400">{header}</th>)}</tr></thead>
        <tbody>{Array.from({ length: 5 }, (_, row) => <tr key={row}>{headers.map((header, column) => <td key={header} className="border border-gray-200 px-4 py-3"><span className={`block h-9 animate-pulse rounded-lg bg-slate-200/80 ${column === 1 ? "w-40" : column === headers.length - 1 ? "w-20" : "w-28"}`} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
