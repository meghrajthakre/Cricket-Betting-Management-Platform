export const PAGE_SIZE = 10;
export const DEFAULT_AVAILABLE_SHARE = 100;

export const createEmptyAdminForm = (availableShare = DEFAULT_AVAILABLE_SHARE) => ({
  firstName: "",
  masterShare: String(availableShare),
  myShare: "",
  ledgerShare: "",
  fixLimit: "",
  password: "",
  confirmPassword: "",
});

export const inputClassName =
  "w-full rounded-xl border border-(--color-border) bg-slate-50 px-3.5 py-2.5 text-sm text-(--color-text-dark) outline-none transition hover:border-(--color-accent) focus:border-(--color-banner) focus:bg-white focus:ring-3 focus:ring-blue-100";

export const readOnlyClassName =
  "w-full cursor-not-allowed rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-400";
