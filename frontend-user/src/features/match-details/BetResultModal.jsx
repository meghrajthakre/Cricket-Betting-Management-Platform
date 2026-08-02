export default function BetResultModal({ result, onClose }) {
    if (!result) return null;

    const success = result.type === "success";

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-[#07182a]/70 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bet-result-title"
        >
            <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className={`h-2 ${success ? "bg-green-500" : "bg-red-500"}`} />
                <div className="px-6 pb-6 pt-7 text-center">
                    <div
                        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold text-white shadow-lg ${
                            success ? "bg-green-500" : "bg-red-500"
                        }`}
                    >
                        {success ? "✓" : "!"}
                    </div>

                    <h2
                        id="bet-result-title"
                        className={`mt-4 text-xl font-extrabold ${success ? "text-green-700" : "text-red-700"}`}
                    >
                        {success ? "Bet Successfully Placed" : "Bhav Change"}
                    </h2>

                    {result.message && (
                        <p className="mt-2 text-sm leading-6 text-gray-600">{result.message}</p>
                    )}

                    {result.details && (
                        <div
                            className={`mt-4 rounded-xl px-3 py-3 text-xs font-bold ${
                                success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                            }`}
                        >
                            {result.details}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className={`mt-5 w-full rounded-xl py-3 text-sm font-bold text-white shadow-md ${
                            success ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                        }`}
                    >
                        {success ? "OK" : "CLOSE"}
                    </button>
                </div>
            </div>
        </div>
    );
}
