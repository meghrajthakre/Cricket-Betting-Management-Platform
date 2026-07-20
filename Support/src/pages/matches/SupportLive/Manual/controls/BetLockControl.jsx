import SubmitButton from "./SubmitButton";

const thClass = "text-left px-4 py-2 text-gray-600 font-medium text-sm border-b border-gray-200 bg-white";
const tdClass = "px-4 py-3 bg-white";
const selectClass = "border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 w-36";

export default function BetLockControl({
    betLock,
    setBetLock,
    mode,
    setMode,
    disabled,
    isSubmitting,
    onSubmit,
}) {
    return (
        <table className="w-full border-collapse">
            <thead>
                <tr>
                    <th className={thClass}>Bet Lock</th>
                    <th className={thClass}>Mode</th>
                    <th className={thClass}>Action</th>
                </tr>
            </thead>
            <tbody>
                <tr className="border-t border-gray-100">
                    <td className={tdClass}>
                        <select value={betLock} onChange={(event) => setBetLock(event.target.value)} className={selectClass} disabled={disabled}>
                            <option value="Unlock">Unlock</option>
                            <option value="Lock">Lock</option>
                        </select>
                    </td>
                    <td className={tdClass}>
                        <select value={mode} onChange={(event) => setMode(event.target.value)} className={selectClass} disabled={disabled}>
                            <option value="Lagai">Lagai</option>
                            <option value="Khai">Khai</option>
                        </select>
                    </td>
                    <td className={tdClass}>
                        <SubmitButton onClick={onSubmit} isSubmitting={isSubmitting} disabled={disabled}>Submit</SubmitButton>
                    </td>
                </tr>
            </tbody>
        </table>
    );
}

