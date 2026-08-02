import MarqueeBannerManager from "./MarqueeBannerManager";

export default function SettingsPage() {
  return (
    <div className="min-h-full bg-(--color-bg-main) p-3 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <MarqueeBannerManager />
      </div>
    </div>
  );
}
