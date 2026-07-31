import Spinner from "../../../../components/common/Spinner";

export default function LiveReportLoader() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4">
      <Spinner
        size={48}
        variant="ocean"
        label="Live report loading"
      />
      <div className="text-center">
        <p className="text-sm font-semibold text-(--color-text-dark)">
          Live report loading...
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Match data connect ho raha hai
        </p>
      </div>
    </div>
  );
}
