import { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { getSuperadminProfile } from "../../services/superAdminService";
import UpdateUsernameCard from "../changeSuperPassword/Updateusernamecard";
import UpdatePasswordCard from "../changeSuperPassword/Updatepasswordcard";
import Spinner from "../../components/common/Spinner";

export default function SuperadminProfilePage() {
  const [profile, setProfile] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getSuperadminProfile();
        setProfile(res.data);
      } catch (err) {
        toast.error(err?.response?.data?.message ?? "Failed to load profile.");
      } finally {
        setFetching(false);
      }
    };
    load();
  }, []);

  if (fetching) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-2.5">
        <Spinner size={24} variant="ocean" label="Profile loading" />
        <span className="text-sm text-gray-400 font-medium">Loading…</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Profile Settings</h1>
          <p className="text-sm text-gray-400 mt-1">Manage your superadmin credentials.</p>
        </div>

        {/* Profile banner */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600
            flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white font-black text-lg">
              {profile?.username?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-gray-800 uppercase tracking-wide truncate">
              {profile?.username}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                  {profile?.role}
                </span>
              </span>
              <span className="text-gray-200">·</span>
              <span className="text-xs text-gray-400 font-mono">
                ID: {profile?._id?.slice(-8)?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Two cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <UpdateUsernameCard
            profile={profile}
            onUpdate={(updated) => setProfile((p) => ({ ...p, ...updated }))}
          />
          <UpdatePasswordCard />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          You will remain logged in after updating your credentials.
        </p>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { borderRadius: "12px", fontSize: "13px", fontWeight: "600" },
        }}
      />
    </div>
  );
}
