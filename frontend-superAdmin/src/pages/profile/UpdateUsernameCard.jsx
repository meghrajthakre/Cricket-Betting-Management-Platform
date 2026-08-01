import { Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Spinner from "../../components/common/Spinner";
import { updateSuperadminProfile } from "../../services/profileService";

export default function UpdateUsernameCard({ profile, onUpdate }) {
  const [username, setUsername] = useState(profile?.username ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => setUsername(profile?.username ?? ""), [profile?.username]);

  const handleSubmit = async () => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) return toast.error("Username cannot be empty.");
    if (trimmed === profile?.username) return toast.error("That's already your username.");

    setLoading(true);
    try {
      const response = await updateSuperadminProfile({ username: trimmed });
      toast.success(response.message ?? "Username updated successfully.");
      onUpdate?.(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.message ?? "Failed to update username.");
    } finally {
      setLoading(false);
    }
  };

  const unchanged = username.trim().toLowerCase() === profile?.username;

  return (
    <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-gray-100 bg-slate-50 px-5 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-(--color-primary)">
          <UserRound aria-hidden="true" size={19} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-(--color-text-dark)">Update Username</h2>
          <p className="mt-0.5 text-xs text-gray-400">Change your account login name</p>
        </div>
      </header>

      <div className="space-y-5 p-5">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
          <span className="text-xs font-medium text-gray-500">Current username</span>
          <span className="truncate text-sm font-bold uppercase text-(--color-primary)">{profile?.username || "—"}</span>
        </div>
        <div>
          <label htmlFor="profile-username" className="mb-2 block text-sm font-semibold text-(--color-text-dark)">New username</label>
          <input id="profile-username" type="text" value={username} onChange={(event) => setUsername(event.target.value)} disabled={loading} placeholder="Enter new username" className="w-full rounded-xl border border-(--color-border) bg-slate-50 px-4 py-3 text-sm text-(--color-text-dark) outline-none transition placeholder:text-gray-400 hover:border-(--color-accent) focus:border-(--color-banner) focus:bg-white focus:ring-3 focus:ring-blue-100 disabled:opacity-60" />
          <p className="mt-2 text-xs text-gray-400">Username is stored in lowercase and must be unique.</p>
        </div>
        <button type="button" onClick={handleSubmit} disabled={loading || !username.trim() || unchanged} className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-(--color-btn-bg) px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-(--color-btn-hover) disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? <Spinner size={17} variant="neon" label="Username saving" /> : <Save aria-hidden="true" size={17} />}
          {loading ? "Saving..." : "Save Username"}
        </button>
      </div>
    </section>
  );
}
