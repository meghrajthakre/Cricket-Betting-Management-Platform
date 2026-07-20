import SubmitButton from "./SubmitButton";

const thClass = "text-left px-4 py-2 text-gray-600 font-medium text-sm border-b border-gray-200 bg-white";
const tdClass = "px-4 py-3 bg-white";

export default function RateDifferenceControl({ rateDiff, setRateDiff, disabled, isSubmitting, onSubmit }) {
    return (
        <table className="w-full border-collapse border-t-2 border-gray-200">
            <thead>
                <tr>
                    <th className={thClass}>Name</th>
                    <th className={thClass}>Diff</th>
                    <th className={thClass}>Action</th>
                </tr>
            </thead>
            <tbody>
                <tr className="border-t border-gray-100">
                    <td className={`${tdClass} text-gray-700`}>Match Rate Difference</td>
                    <td className={tdClass}>
                        <select
                            value={rateDiff}
                            onChange={(event) => setRateDiff(event.target.value)}
                            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 w-28"
                            disabled={disabled}
                        >
                            {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => (
                                <option key={number} value={number}>{number}</option>
                            ))}
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

