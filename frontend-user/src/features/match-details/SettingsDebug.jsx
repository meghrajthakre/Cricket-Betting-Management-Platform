export default function SettingsDebug({ settings }) {
    return (
        <div className="bg-gray-100 p-2 mb-4 rounded text-xs">
            <details>
                <summary className="font-bold cursor-pointer">
                    Settings Debug
                </summary>
                <pre className="mt-1 overflow-auto">
                    {JSON.stringify(settings, null, 2)}
                </pre>
            </details>
        </div>
    );
}
