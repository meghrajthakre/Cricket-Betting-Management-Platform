import { useEffect, useState } from "react";
import { ShieldCheck, UserRound } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import Spinner from "../../shared/components/Spinner";
import { getSuperadminProfile } from "./api/profileApi";
import UpdatePasswordCard from "./UpdatePasswordCard";
import UpdateUsernameCard from "./UpdateUsernameCard";

export default function SuperAdminProfilePage() {
  const [profile, setProfile] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getSuperadminProfile()
      .then((response) => setProfile(response.data))
      .catch((error) => toast.error(error?.response?.data?.message ?? "Failed to load profile."))
      .finally(() => setFetching(false));
  }, []);

  if (fetching) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-(--color-bg-main)">
        <div className="flex flex-col items-center gap-3 text-center">
          <Spinner size={38} variant="ocean" label="Profile loading" />
          <p className="text-sm font-semibold text-(--color-text-dark)">Loading profile...</p>
        </div>
      </div>
    );
  }

  const username = profile?.username || "Superadmin";

  return (
    <div className="min-h-full bg-(--color-bg-main) p-3 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="animate-fade-up overflow-hidden rounded-2xl border border-(--color-border) bg-white shadow-sm">
          <header className="relative overflow-hidden bg-(--color-primary) px-5 py-5 text-white sm:px-7 sm:py-6">
            <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-white/5" />
            <div className="absolute -right-4 -bottom-20 h-36 w-36 rounded-full bg-(--color-banner)/35" />
            <div className="relative flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10">
                <UserRound aria-hidden="true" size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold sm:text-2xl">Profile Settings</h1>
                <p className="mt-1 text-sm leading-6 text-(--color-text-muted)">
                  Manage your Superadmin username and account security.
                </p>
              </div>
            </div>
          </header>

          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-7">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-(--color-primary) text-2xl font-black text-white shadow-sm">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold uppercase tracking-wide text-(--color-text-dark)">{username}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-500">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck aria-hidden="true" size={15} className="text-(--color-banner)" />
                  {profile?.role || "Super Admin"}
                </span>
                {profile?._id && <span className="font-mono text-gray-400">ID: {profile._id.slice(-8).toUpperCase()}</span>}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          <UpdateUsernameCard profile={profile} onUpdate={(updated) => setProfile((current) => ({ ...current, ...updated }))} />
          <UpdatePasswordCard />
        </div>

        <p className="text-center text-xs text-gray-400">You will remain signed in after updating your credentials.</p>
      </div>

      <Toaster position="bottom-right" toastOptions={{ style: { borderRadius: "12px", fontSize: "13px", fontWeight: "600" } }} />
    </div>
  );
}
