import { Building2, Plus, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import Field from "../../shared/components/Field";
import Modal from "../../shared/components/Modal";
import Spinner from "../../shared/components/Spinner";
import { createSubCompany, getNextSubCompanyUsername, getSubCompanies, toggleSubCompanyStatus } from "./api/subCompanyApi";

const inputClass = "w-full rounded-xl border border-(--color-border) bg-slate-50 px-3.5 py-2.5 text-sm text-(--color-text-dark) outline-none transition focus:border-(--color-banner) focus:bg-white focus:ring-3 focus:ring-blue-100";
const readOnlyClass = `${inputClass} cursor-not-allowed bg-gray-100 text-gray-500`;
const emptyForm = { username: "Generating...", firstName: "", myShare: "20", companyShare: "80", fixLimit: "", password: "", confirmPassword: "" };

export default function SubCompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getSubCompanies();
      setCompanies(response.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Sub Companies load nahi hui");
    } finally { setLoading(false); }
  }, []);

  const loadUsername = useCallback(async () => {
    try {
      const response = await getNextSubCompanyUsername();
      setForm((current) => ({ ...current, username: response.data.username }));
    } catch { setForm((current) => ({ ...current, username: "Created on submit" })); }
  }, []);

  useEffect(() => { load(); loadUsername(); }, [load, loadUsername]);

  const setField = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => {
      if (field === "myShare") return { ...current, myShare: value, companyShare: value === "" ? "" : String(100 - Number(value)) };
      if (field === "companyShare") return { ...current, companyShare: value, myShare: value === "" ? "" : String(100 - Number(value)) };
      return { ...current, [field]: value };
    });
  };

  const shareValid = useMemo(() => {
    const mine = Number(form.myShare); const company = Number(form.companyShare);
    return mine >= 0 && company >= 0 && mine <= 100 && company <= 100 && mine + company === 100;
  }, [form.companyShare, form.myShare]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.firstName.trim()) return toast.error("Owner name required hai");
    if (!shareValid) return toast.error("My Share + Sub Company Share 100% hona chahiye");
    if (form.password.length < 4) return toast.error("Password minimum 4 characters hona chahiye");
    if (form.password !== form.confirmPassword) return toast.error("Passwords match nahi hain");
    setSaving(true);
    try {
      const response = await createSubCompany({ username: form.username, firstName: form.firstName.trim(), allocatedShare: Number(form.companyShare) * 100, fixLimit: Number(form.fixLimit || 0), password: form.password, confirmPassword: form.confirmPassword });
      toast.success(response.message);
      setCreateOpen(false);
      setForm(emptyForm);
      await Promise.all([load(), loadUsername()]);
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Sub Company create nahi hui";
      setBackendError(message);
    }
    finally { setSaving(false); }
  };

  const toggleStatus = async (company) => {
    try { const response = await toggleSubCompanyStatus(company._id); toast.success(response.message); await load(); }
    catch (error) { toast.error(error?.response?.data?.message || "Status update nahi hua"); }
  };

  return (
    <div className="min-h-full bg-(--color-bg-main) p-2 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="relative overflow-hidden rounded-2xl bg-(--color-primary) px-5 py-5 text-white shadow-sm sm:px-7 sm:py-6">
          <div className="relative flex items-center gap-4"><div className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/10"><Building2 size={22} /></div><div><h1 className="text-xl font-bold sm:text-2xl">Sub Companies</h1><p className="mt-1 text-sm text-(--color-text-muted)">Create owner panels and control profit/loss share.</p></div></div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-(--color-border) px-5 py-4"><h2 className="flex items-center gap-2 font-bold text-(--color-primary)"><ShieldCheck size={18} />All Admins</h2><button type="button" onClick={() => { setCreateOpen(true); loadUsername(); }} className="flex items-center gap-2 rounded-xl bg-(--color-btn-bg) px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-(--color-btn-hover) hover:shadow-md active:translate-y-0"><Plus size={16} />Create Sub Company</button></div>
          {loading ? <div className="flex justify-center py-14"><Spinner size={22} variant="ocean" /></div> : companies.length === 0 ? <p className="py-14 text-center text-sm text-gray-400">No Sub Company created yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] border-collapse text-sm"><thead className="bg-slate-50 text-xs uppercase text-gray-500"><tr><th className="border border-gray-200 px-4 py-3 text-left">Username</th><th className="border border-gray-200 px-4 py-3 text-left">Owner</th><th className="border border-gray-200 px-4 py-3 text-left">Mobile</th><th className="border border-gray-200 px-4 py-3 text-right">My Share</th><th className="border border-gray-200 px-4 py-3 text-right">Company Share</th><th className="border border-gray-200 px-4 py-3 text-right">Fix Limit</th><th className="border border-gray-200 px-4 py-3 text-right">Users</th><th className="border border-gray-200 px-4 py-3">Status</th></tr></thead><tbody>{companies.map((company) => <tr key={company._id} className="hover:bg-blue-50/30"><td className="border border-gray-200 px-4 py-3 font-bold text-(--color-primary)">{company.username?.replace(/^admin/i, "Admin")}</td><td className="border border-gray-200 px-4 py-3">{company.firstName}</td><td className="border border-gray-200 px-4 py-3">{company.mobile || "-"}</td><td className="border border-gray-200 px-4 py-3 text-right">{company.myShare}%</td><td className="border border-gray-200 px-4 py-3 text-right">{company.downlineShare}%</td><td className="border border-gray-200 px-4 py-3 text-right tabular-nums">{Number(company.fixLimit || 0).toLocaleString()}</td><td className="border border-gray-200 px-4 py-3 text-right">{company.userCount}</td><td className="border border-gray-200 px-4 py-3 text-center"><button type="button" onClick={() => toggleStatus(company)} className={`rounded-full px-3 py-1 text-xs font-bold ${company.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{company.isActive ? "Active" : "Blocked"}</button></td></tr>)}</tbody></table></div>}
        </section>
      </div>
      <Modal open={createOpen} title="Create Sub Company" onClose={saving ? () => {} : () => setCreateOpen(false)}>
        <form onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="User Name"><div className="relative"><input className={readOnlyClass} value={form.username} readOnly />{form.username === "Generating..." && <span className="absolute top-1/2 right-3 -translate-y-1/2"><Spinner size={15} variant="ocean" /></span>}</div></Field>
            <Field label="Owner / First Name"><input className={inputClass} value={form.firstName} onChange={setField("firstName")} placeholder="Enter owner name" /></Field>
            <Field label="Fix Limit"><input className={inputClass} type="number" min="0" value={form.fixLimit} onChange={setField("fixLimit")} placeholder="0" /></Field>
            <Field label="My Share (%)"><input className={inputClass} type="number" min="0" max="100" value={form.myShare} onChange={setField("myShare")} /></Field>
            <Field label="Sub Company Share (%)"><input className={inputClass} type="number" min="0" max="100" value={form.companyShare} onChange={setField("companyShare")} /></Field>
            <Field label="Password"><input className={inputClass} type="password" value={form.password} onChange={setField("password")} placeholder="Minimum 4 characters" /></Field>
            <Field label="Confirm Password"><input className={inputClass} type="password" value={form.confirmPassword} onChange={setField("confirmPassword")} placeholder="Re-enter password" /></Field>
          </div>
          <div className={`mt-4 rounded-xl border p-3 text-xs ${shareValid ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-red-100 bg-red-50 text-red-600"}`}>My Share {form.myShare || 0}% + Company Share {form.companyShare || 0}% = {Number(form.myShare || 0) + Number(form.companyShare || 0)}%</div>
          <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setCreateOpen(false)} className="rounded-xl border border-(--color-border) px-4 py-2.5 text-sm font-bold text-gray-600 transition duration-200 hover:border-(--color-accent) hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button><button disabled={saving || !shareValid} className="flex items-center gap-2 rounded-xl bg-(--color-btn-bg) px-5 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-(--color-btn-hover) hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">{saving ? <Spinner size={16} variant="neon" /> : <Plus size={16} />}{saving ? "Creating..." : "Create"}</button></div>
        </form>
      </Modal>
      <Modal open={Boolean(backendError)} title="Sub Company Error" onClose={() => setBackendError("")}>
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{backendError}</div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={() => setBackendError("")} className="rounded-xl bg-(--color-btn-bg) px-5 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-(--color-btn-hover) hover:shadow-md active:translate-y-0">OK</button></div>
      </Modal>
      <Toaster position="bottom-right" />
    </div>
  );
}
