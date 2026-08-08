import { Ban, Building2, CheckCircle2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import Field from "../../shared/components/Field";
import Modal from "../../shared/components/Modal";
import Spinner from "../../shared/components/Spinner";
import { createSubCompany, deleteSubCompany, getNextSubCompanyUsername, getSubCompanies, toggleSubCompanyStatus, updateSubCompanyFixLimit } from "./api/subCompanyApi";

const inputClass = "w-full rounded-xl border border-(--color-border) bg-slate-50 px-3.5 py-2.5 text-sm text-(--color-text-dark) outline-none transition focus:border-(--color-banner) focus:bg-white focus:ring-3 focus:ring-blue-100";
const readOnlyClass = `${inputClass} cursor-not-allowed bg-gray-100 text-gray-500`;
const emptyForm = { username: "Generating...", firstName: "", myShare: "20", companyShare: "80", fixLimit: "", password: "", confirmPassword: "" };
const complementShare = (value) => {
  if (value === "" || !Number.isFinite(Number(value))) return "";
  return String(Number((100 - Number(value)).toFixed(2)));
};
const toShareBps = (value) => Math.round(Number(value) * 100);

export default function SubCompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [editLimit, setEditLimit] = useState("");
  const [deleteCompany, setDeleteCompany] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [statusCompany, setStatusCompany] = useState(null);

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
      if (field === "myShare") return { ...current, myShare: value, companyShare: complementShare(value) };
      if (field === "companyShare") return { ...current, companyShare: value, myShare: complementShare(value) };
      return { ...current, [field]: value };
    });
  };

  const shareValid = useMemo(() => {
    if (form.myShare === "" || form.companyShare === "") return false;
    const mine = Number(form.myShare); const company = Number(form.companyShare);
    const mineBps = toShareBps(mine); const companyBps = toShareBps(company);
    const hasValidPrecision = Math.abs(mine * 100 - mineBps) < 1e-8 && Math.abs(company * 100 - companyBps) < 1e-8;
    return Number.isFinite(mine) && Number.isFinite(company) && hasValidPrecision && mineBps >= 0 && companyBps >= 0 && mineBps <= 10000 && companyBps <= 10000 && mineBps + companyBps === 10000;
  }, [form.companyShare, form.myShare]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.firstName.trim()) return toast.error("Owner name required hai");
    if (!/^Admin\d+$/i.test(form.username)) return toast.error("Username generate hone ka wait karein");
    if (!shareValid) return toast.error("My Share + Sub Company Share 100% hona chahiye");
    if (form.password.length < 4) return toast.error("Password minimum 4 characters hona chahiye");
    if (form.password !== form.confirmPassword) return toast.error("Passwords match nahi hain");
    setBackendError("");
    setSaving(true);
    try {
      const response = await createSubCompany({ username: form.username, firstName: form.firstName.trim(), allocatedShare: toShareBps(form.companyShare), fixLimit: Number(form.fixLimit || 0), password: form.password, confirmPassword: form.confirmPassword });
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

  const confirmStatusChange = async () => {
    if (!statusCompany) return;
    setActionBusy(true);
    try { const response = await toggleSubCompanyStatus(statusCompany._id); toast.success(response.message); setStatusCompany(null); await load(); }
    catch (error) { toast.error(error?.response?.data?.message || "Status update nahi hua"); }
    finally { setActionBusy(false); }
  };
  const toggleStatus = (company) => setStatusCompany(company);

  const saveFixLimit = async (event) => {
    event.preventDefault();
    const value = Number(editLimit);
    if (!Number.isFinite(value) || value < 0) return toast.error("Valid non-negative fix limit enter karein");
    setActionBusy(true);
    try {
      const response = await updateSubCompanyFixLimit(editCompany._id, value);
      toast.success(response.message);
      setEditCompany(null);
      await load();
    } catch (error) { toast.error(error?.response?.data?.message || "Fix limit update nahi hui"); }
    finally { setActionBusy(false); }
  };

  const confirmDelete = async () => {
    setActionBusy(true);
    try {
      const response = await deleteSubCompany(deleteCompany._id);
      toast.success(response.message);
      setDeleteCompany(null);
      await load();
    } catch (error) { toast.error(error?.response?.data?.message || "Sub Company delete nahi hui"); }
    finally { setActionBusy(false); }
  };

  return (
    <div className="min-h-full bg-(--color-bg-main) p-2 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="relative overflow-hidden rounded-2xl bg-(--color-primary) px-5 py-5 text-white shadow-sm sm:px-7 sm:py-6">
          <div className="relative flex items-center gap-4"><div className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/10"><Building2 size={22} /></div><div><h1 className="text-xl font-bold sm:text-2xl">Sub Companies</h1><p className="mt-1 text-sm text-(--color-text-muted)">Create owner panels and control profit/loss share.</p></div></div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-(--color-border) bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-(--color-border) px-5 py-4"><h2 className="flex items-center gap-2 font-bold text-(--color-primary)"><ShieldCheck size={18} />All Admins</h2><button type="button" onClick={() => { setBackendError(""); setCreateOpen(true); loadUsername(); }} className="flex items-center gap-2 rounded-xl bg-(--color-btn-bg) px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-(--color-btn-hover) hover:shadow-md active:translate-y-0"><Plus size={16} />Create Sub Company</button></div>
          {loading ? <div className="flex justify-center py-14"><Spinner size={22} variant="ocean" /></div> : companies.length === 0 ? <p className="py-14 text-center text-sm text-gray-400">No Sub Company created yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] border-collapse text-sm"><thead className="bg-slate-50 text-xs uppercase text-gray-500"><tr><th className="border border-gray-200 px-4 py-3 text-left">Username</th><th className="border border-gray-200 px-4 py-3 text-left">Owner</th><th className="border border-gray-200 px-4 py-3 text-left">Mobile</th><th className="border border-gray-200 px-4 py-3 text-right">My Share</th><th className="border border-gray-200 px-4 py-3 text-right">Company Share</th><th className="border border-gray-200 px-4 py-3 text-right">Fix Limit</th><th className="border border-gray-200 px-4 py-3 text-right">Users</th><th className="border border-gray-200 px-4 py-3">Status</th><th className="border border-gray-200 px-4 py-3">Actions</th></tr></thead><tbody>{companies.map((company) => <tr key={company._id} className="hover:bg-blue-50/30"><td className="border border-gray-200 px-4 py-3 font-bold text-(--color-primary)">{company.username?.replace(/^admin/i, "Admin")}</td><td className="border border-gray-200 px-4 py-3">{company.firstName}</td><td className="border border-gray-200 px-4 py-3">{company.mobile || "-"}</td><td className="border border-gray-200 px-4 py-3 text-right">{company.myShare}%</td><td className="border border-gray-200 px-4 py-3 text-right">{company.downlineShare}%</td><td className="border border-gray-200 px-4 py-3 text-right tabular-nums">{Number(company.fixLimit || 0).toLocaleString()}</td><td className="border border-gray-200 px-4 py-3 text-right">{company.userCount}</td><td className="border border-gray-200 px-4 py-3 text-center"><span className={`rounded-full px-3 py-1 text-xs font-bold ${company.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{company.isActive ? "Active" : "Blocked"}</span></td><td className="border border-gray-200 px-3 py-3"><div className="flex items-center justify-center gap-2"><button disabled={actionBusy} type="button" title="Edit fix limit" onClick={() => { setEditCompany(company); setEditLimit(String(company.fixLimit || 0)); }} className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 disabled:opacity-50"><Pencil size={15} /></button><button disabled={actionBusy} type="button" title={company.isActive ? "Block" : "Unblock"} onClick={() => toggleStatus(company)} className={`rounded-lg p-2 disabled:opacity-50 ${company.isActive ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>{company.isActive ? <Ban size={15} /> : <CheckCircle2 size={15} />}</button><button disabled={actionBusy} type="button" title="Delete" onClick={() => setDeleteCompany(company)} className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>}
        </section>
      </div>
      <Modal open={createOpen} title="Create Sub Company" onClose={saving ? () => {} : () => setCreateOpen(false)}>
        <form onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="User Name"><div className="relative"><input className={readOnlyClass} value={form.username} readOnly />{form.username === "Generating..." && <span className="absolute top-1/2 right-3 -translate-y-1/2"><Spinner size={15} variant="ocean" /></span>}</div></Field>
            <Field label="Owner / First Name"><input className={inputClass} value={form.firstName} onChange={setField("firstName")} placeholder="Enter owner name" /></Field>
            <Field label="Fix Limit"><input className={inputClass} type="number" min="0" value={form.fixLimit} onChange={setField("fixLimit")} placeholder="0" /></Field>
            <Field label="My Share (%)"><input className={inputClass} type="number" min="0" max="100" step="0.01" value={form.myShare} onChange={setField("myShare")} /></Field>
            <Field label="Sub Company Share (%)"><input className={inputClass} type="number" min="0" max="100" step="0.01" value={form.companyShare} onChange={setField("companyShare")} /></Field>
            <Field label="Password"><input className={inputClass} type="password" minLength={4} value={form.password} onChange={setField("password")} placeholder="Minimum 4 characters" /></Field>
            <Field label="Confirm Password"><input className={inputClass} type="password" minLength={4} value={form.confirmPassword} onChange={setField("confirmPassword")} placeholder="Re-enter password" /></Field>
          </div>
          <div className={`mt-4 rounded-xl border p-3 text-xs ${shareValid ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-red-100 bg-red-50 text-red-600"}`}>My Share {form.myShare || 0}% + Company Share {form.companyShare || 0}% = {Number((Number(form.myShare || 0) + Number(form.companyShare || 0)).toFixed(2))}%</div>
          <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setCreateOpen(false)} className="rounded-xl border border-(--color-border) px-4 py-2.5 text-sm font-bold text-gray-600 transition duration-200 hover:border-(--color-accent) hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button><button disabled={saving || !shareValid || !/^Admin\d+$/i.test(form.username)} className="flex items-center gap-2 rounded-xl bg-(--color-btn-bg) px-5 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-(--color-btn-hover) hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">{saving ? <Spinner size={16} variant="neon" /> : <Plus size={16} />}{saving ? "Creating..." : "Create"}</button></div>
        </form>
      </Modal>
      <Modal open={Boolean(backendError)} title="Sub Company Error" onClose={() => setBackendError("")}>
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{backendError}</div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={() => setBackendError("")} className="rounded-xl bg-(--color-btn-bg) px-5 py-2.5 text-sm font-bold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-(--color-btn-hover) hover:shadow-md active:translate-y-0">OK</button></div>
      </Modal>
      <Modal open={Boolean(editCompany)} title="Edit Fix Limit" onClose={actionBusy ? () => {} : () => setEditCompany(null)}>
        <form onSubmit={saveFixLimit}>
          <p className="mb-4 text-sm text-gray-600">{editCompany?.username?.toUpperCase()} ki maximum combined user limit update karein.</p>
          <Field label="Fix Limit"><input autoFocus className={inputClass} type="number" min="0" step="0.01" value={editLimit} onChange={(event) => setEditLimit(event.target.value)} /></Field>
          <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={actionBusy} onClick={() => setEditCompany(null)} className="rounded-xl border border-(--color-border) px-4 py-2.5 text-sm font-bold text-gray-600">Cancel</button><button disabled={actionBusy} className="rounded-xl bg-(--color-btn-bg) px-5 py-2.5 text-sm font-bold text-white">{actionBusy ? "Saving..." : "Save Limit"}</button></div>
        </form>
      </Modal>
      <Modal open={Boolean(deleteCompany)} title="Delete Sub Company" onClose={actionBusy ? () => {} : () => setDeleteCompany(null)}>
        <p className="text-sm text-gray-700"><strong>{deleteCompany?.username?.toUpperCase()}</strong> permanently delete karna hai?</p>
        <p className="mt-2 text-xs text-red-600">Agar is Sub Company ke users hain to delete reject hoga. Pehle users delete ya reassign karein.</p>
        <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={actionBusy} onClick={() => setDeleteCompany(null)} className="rounded-xl border border-(--color-border) px-4 py-2.5 text-sm font-bold text-gray-600">Cancel</button><button type="button" disabled={actionBusy} onClick={confirmDelete} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700">{actionBusy ? "Deleting..." : "Delete"}</button></div>
      </Modal>
      <Modal open={Boolean(statusCompany)} title={statusCompany?.isActive ? "Block Sub Company" : "Unblock Sub Company"} onClose={actionBusy ? () => {} : () => setStatusCompany(null)}>
        <div className={`rounded-xl border p-4 ${statusCompany?.isActive ? "border-red-100 bg-red-50" : "border-emerald-100 bg-emerald-50"}`}>
          <div className="flex items-start gap-3"><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${statusCompany?.isActive ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>{statusCompany?.isActive ? <Ban size={20} /> : <CheckCircle2 size={20} />}</div><div><p className="text-sm font-semibold text-gray-800">{statusCompany?.isActive ? "Is Sub Company ko block karna hai?" : "Is Sub Company ko unblock karna hai?"}</p><p className="mt-1 text-xs text-gray-500"><strong>{statusCompany?.username?.toUpperCase()}</strong> {statusCompany?.isActive ? "block hone ke baad panel mein login nahi kar payegi." : "dobara panel mein login kar payegi."}</p></div></div>
        </div>
        <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={actionBusy} onClick={() => setStatusCompany(null)} className="rounded-xl border border-(--color-border) px-4 py-2.5 text-sm font-bold text-gray-600 disabled:opacity-50">Cancel</button><button type="button" disabled={actionBusy} onClick={confirmStatusChange} className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${statusCompany?.isActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>{statusCompany?.isActive ? <Ban size={16} /> : <CheckCircle2 size={16} />}{actionBusy ? "Please wait..." : statusCompany?.isActive ? "Block" : "Unblock"}</button></div>
      </Modal>
      <Toaster position="bottom-right" />
    </div>
  );
}
