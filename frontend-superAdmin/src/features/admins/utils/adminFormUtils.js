export function calculateAdminShare(masterShare, myShare) {
  if (masterShare === "" || myShare === "") return "";
  const result = Number(masterShare) - Number(myShare);
  return Number.isFinite(result) && result >= 0 ? result : "Invalid";
}

export function validateAdminForm(form, adminShare) {
  const masterShare = Number(form.masterShare);
  const myShare = Number(form.myShare);
  if (!form.firstName.trim()) return "First name is required";
  if (!form.password) return "Password is required";
  if (form.password.length < 6) return "Password must be at least 6 characters";
  if (form.password !== form.confirmPassword) return "Passwords do not match";
  if (form.myShare === "") return "My Share is required";
  if (myShare < 0 || myShare > masterShare || adminShare === "Invalid") return "Enter a valid My Share";
  if (Number(form.ledgerShare || 0) < 0) return "Ledger Share cannot be negative";
  if (Number(form.fixLimit || 0) < 0) return "Fix Limit cannot be negative";
  return null;
}

export const toCreateAdminPayload = (form) => ({
  firstName: form.firstName.trim(),
  masterShare: Number(form.masterShare),
  myShare: Number(form.myShare),
  ledgerShare: Number(form.ledgerShare || 0),
  fixLimit: Number(form.fixLimit || 0),
  password: form.password,
  confirmPassword: form.confirmPassword,
});
