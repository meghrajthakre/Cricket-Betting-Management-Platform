import { CircleDollarSign, Eye, EyeOff, Gauge, UserPlus, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Spinner from "../../shared/components/Spinner";
import { createUser, getLimitSummary, getNextUsername } from "../../shared/api/userApi";

const EMPTY_FORM = {
  firstName: "",
  password: "",
  confirmPassword: "",
  limit: "",
};
const inputClassName =
  "w-full rounded-xl border border-(--color-border) bg-slate-50 px-4 py-2.5 text-sm text-(--color-text-dark) outline-none transition focus:border-(--color-banner) focus:bg-white focus:ring-3 focus:ring-blue-100";

export default function CreateUser({ onCancel, onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [generatedUsername, setGeneratedUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limitSummary, setLimitSummary] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getNextUsername(controller.signal)
      .then((response) => setGeneratedUsername(response?.data?.username || ""))
      .catch((requestError) => {
        if (requestError?.code !== "ERR_CANCELED") {
          setError(
            requestError?.response?.data?.message || "Could not generate username.",
          );
        }
      });
    getLimitSummary(controller.signal)
      .then((response) => setLimitSummary(response?.data || null))
      .catch((requestError) => {
        if (requestError?.code !== "ERR_CANCELED") {
          setError(requestError?.response?.data?.message || "Could not load limit summary.");
        }
      });
    return () => controller.abort();
  }, []);

  const change = (event) => {
    setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
    setError("");
  };

  const changeLimit = (event) => {
    const value = event.target.value;
    if (value === "" || /^\d+(\.\d{0,2})?$/.test(value)) {
      setForm((current) => ({ ...current, limit: value }));
      setError("");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const limit = Number(form.limit);
    if (!form.firstName.trim()) return setError("Full name is required.");
    if (form.password.length < 4)
      return setError("Password must be at least 4 characters.");
    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match.");
    if (!Number.isFinite(limit) || limit < 0)
      return setError("Enter a valid non-negative limit.");
    if (limitSummary && limit > Number(limitSummary.remainingLimit || 0))
      return setError(`Only ${Number(limitSummary.remainingLimit || 0).toLocaleString()} limit is available.`);

    setLoading(true);
    try {
      const response = await createUser({
        firstName: form.firstName.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        limit,
      });
      const username = response?.data?.username || "";
      setGeneratedUsername(username);
      toast.success(
        username ? `User ${username.toUpperCase()} created successfully` : "User created successfully",
      );
      setForm(EMPTY_FORM);
      if (response?.allocation) {
        setLimitSummary((current) => ({
          fixLimit: current?.fixLimit || 0,
          usedLimit: current?.usedLimit || 0,
          allocatedLimit: response.allocation.totalAllocated,
          remainingLimit: response.allocation.remainingLimit,
        }));
      }
      onSuccess(response?.data);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          "Could not create user.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {limitSummary && (
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
          {[
            { label: "Fix Limit", value: limitSummary.fixLimit, icon: Gauge },
            { label: "Used", value: limitSummary.usedLimit, icon: WalletCards },
            { label: "Remaining", value: limitSummary.remainingLimit, icon: CircleDollarSign },
          ].map((item) => (
            <div key={item.label} className="min-w-0 rounded-lg bg-white p-2.5 text-center shadow-sm">
              <item.icon size={16} className="mx-auto mb-1 text-blue-600" />
              <p className="text-[10px] font-semibold uppercase text-gray-400">{item.label}</p>
              <p className="truncate text-sm font-bold text-(--color-text-dark)">{Number(item.value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
          ))}
        </div>
      )}
      <div>
        <label
          htmlFor="generated-username"
          className="mb-2 block text-sm font-semibold text-(--color-text-dark)"
        >
          Username
        </label>
        <input
          id="generated-username"
          value={generatedUsername}
          readOnly
          className={`${inputClassName} cursor-default font-bold`}
          placeholder="Generating username..."
        />
        {generatedUsername && (
          <p className="mt-1.5 text-xs font-semibold text-emerald-600">
            This username will be assigned to the new user.
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="user-name"
          className="mb-2 block text-sm font-semibold text-(--color-text-dark)"
        >
          Full name
        </label>
        <input
          id="user-name"
          name="firstName"
          value={form.firstName}
          onChange={change}
          className={inputClassName}
          placeholder="Enter full name"
          autoFocus
        />
      </div>
      <div>
        <label
          htmlFor="initial-balance"
          className="mb-2 block text-sm font-semibold text-(--color-text-dark)"
        >
          Limit
        </label>
        <input
          id="initial-balance"
          name="limit"
          type="text"
          inputMode="decimal"
          pattern="[0-9]+([.][0-9]{1,2})?"
          value={form.limit}
          onChange={changeLimit}
          className={inputClassName}
          placeholder="0.00"
        />
        <p className="mt-1.5 text-xs text-gray-400">
          {limitSummary
            ? `${Number(form.limit || 0).toLocaleString()} limit dene ke baad ${Math.max(0, Number(limitSummary.remainingLimit || 0) - Number(form.limit || 0)).toLocaleString()} remaining rahega.`
            : "Enter the user limit."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="user-password"
            className="mb-2 block text-sm font-semibold text-(--color-text-dark)"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="user-password"
              name="password"
              type={showPassword ? "text" : "password"}
              minLength={4}
              value={form.password}
              onChange={change}
              className={`${inputClassName} pr-11`}
              placeholder="Minimum 4 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center text-gray-400"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        <div>
          <label
            htmlFor="confirm-user-password"
            className="mb-2 block text-sm font-semibold text-(--color-text-dark)"
          >
            Confirm password
          </label>
          <input
            id="confirm-user-password"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            minLength={4}
            value={form.confirmPassword}
            onChange={change}
            className={inputClassName}
            placeholder="Re-enter password"
          />
        </div>
      </div>
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end sm:gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="min-h-11 w-full rounded-xl border border-(--color-border) px-4 py-2.5 text-sm font-semibold text-gray-600 sm:w-auto"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-(--color-btn-bg) px-5 py-2.5 text-sm font-bold text-white hover:bg-(--color-btn-hover) disabled:opacity-50 sm:w-auto"
        >
          {loading ? (
            <Spinner size={16} variant="neon" />
          ) : (
            <UserPlus size={17} />
          )}
          {loading ? "Creating..." : "Create User"}
        </button>
      </div>
    </form>
  );
}
