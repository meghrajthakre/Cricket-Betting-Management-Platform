const rows = Array.from({ length: 6 }, (_, index) => index);

const SkeletonBar = ({ className }) => (
  <div className={`h-3 rounded-full bg-slate-200 ${className}`} />
);

export default function LedgerSkeleton() {
  return rows.map((row) => (
    <tr
      key={row}
      className="animate-pulse border-b border-[#d8dee8] even:bg-slate-50"
      aria-hidden="true"
    >
      <td className="px-4 py-5"><SkeletonBar className="w-20" /></td>
      <td className="px-4 py-5"><SkeletonBar className={row % 2 ? "w-52" : "w-64"} /></td>
      <td className="px-4 py-5"><SkeletonBar className="ml-auto w-16" /></td>
      <td className="px-4 py-5"><SkeletonBar className="ml-auto w-16" /></td>
      <td className="px-4 py-5"><SkeletonBar className="ml-auto w-20" /></td>
    </tr>
  ));
}
