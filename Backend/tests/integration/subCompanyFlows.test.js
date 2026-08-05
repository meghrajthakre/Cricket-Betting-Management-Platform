"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const app = require("../../server");
const { User, ROLES } = require("../../src/modules/user/user.model");
const { generateAccessToken } = require("../../src/utils/generateToken");

const enabled = process.env.TEST_ALLOW_DB_WRITES === "true" && Boolean(process.env.TEST_MONGODB_URI);
const stamp = Date.now();
let server; let baseUrl; let superAdmin; let otherSuperAdmin; let inactiveSuperAdmin; let normalUser; let support; let created;
let sequence = 0;
const auth = (user, token = generateAccessToken({ id: user._id, role: user.role })) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });
const validBody = (overrides = {}) => {
  sequence += 1;
  return { username: `company${stamp}${sequence}`, mobile: `${stamp}${String(sequence).padStart(3, "0")}`, firstName: "Company Owner", allocatedShare: 8000, fixLimit: 1000, password: "pass1234", confirmPassword: "pass1234", ...overrides };
};
const create = (user, body, token) => fetch(`${baseUrl}/api/sub-companies`, { method: "POST", headers: user ? auth(user, token) : { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test.before(async () => {
  if (!enabled) return;
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  [superAdmin, otherSuperAdmin, inactiveSuperAdmin, normalUser, support] = await User.create([
    { username: `companysa${stamp}`, password: "pass1234", role: ROLES.SUPERADMIN },
    { username: `companyother${stamp}`, password: "pass1234", role: ROLES.SUPERADMIN },
    { username: `companyinactive${stamp}`, password: "pass1234", role: ROLES.SUPERADMIN, isActive: false },
    { username: `companyuser${stamp}`, password: "pass1234", role: ROLES.USER },
    { username: `companysupport${stamp}`, password: "pass1234", role: ROLES.SUPPORT },
  ]);
  server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (!enabled) return;
  await new Promise((resolve) => server.close(resolve));
  const roots = [superAdmin, otherSuperAdmin, inactiveSuperAdmin, normalUser, support].map((user) => user._id);
  await User.deleteMany({ $or: [{ _id: { $in: roots } }, { createdBy: { $in: roots } }, { username: new RegExp(String(stamp)) }] });
  await mongoose.disconnect();
});

test("Authenticated Super Admin can create a Sub Company", { skip: !enabled }, async () => {
  const requested = validBody(); const response = await create(superAdmin, requested); const body = await response.json();
  assert.equal(response.status, 201); assert.equal(body.success, true); assert.equal(body.data.role, ROLES.SUB_COMPANY);
  assert.equal(String(body.data.parentId), String(superAdmin._id)); assert.equal(String(body.data.createdBy), String(superAdmin._id));
  assert.equal(body.data.isActive, true); assert.equal(body.data.allocatedShare, requested.allocatedShare); created = body.data;
});
test("Request without access token is rejected with 401", { skip: !enabled }, async () => assert.equal((await create(null, validBody())).status, 401));
test("Invalid access token is rejected with 401", { skip: !enabled }, async () => assert.equal((await create(superAdmin, validBody(), "not-a-valid-token")).status, 401));
test("Expired access token is rejected with 401", { skip: !enabled }, async () => {
  const token = jwt.sign({ id: superAdmin._id, role: superAdmin.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: -1, issuer: "betting-dashboard", audience: "betting-dashboard-client" });
  const response = await create(superAdmin, validBody(), token); const body = await response.json(); assert.equal(response.status, 401); assert.match(body.message, /session expired/i);
});
test("Normal User cannot create a Sub Company", { skip: !enabled }, async () => assert.equal((await create(normalUser, validBody())).status, 403));
test("Support cannot create a Sub Company", { skip: !enabled }, async () => assert.equal((await create(support, validBody())).status, 403));
test("Inactive Super Admin cannot create a Sub Company", { skip: !enabled }, async () => assert.equal((await create(inactiveSuperAdmin, validBody())).status, 403));

test("Successful creation persists secure and correct data", { skip: !enabled }, async () => {
  const plainPassword = "secure-pass-123"; const requested = validBody({ password: plainPassword, confirmPassword: plainPassword });
  const response = await create(superAdmin, requested); const body = await response.json(); const record = await User.findById(body.data._id).select("+password");
  assert.equal(response.status, 201); assert.ok(record); assert.equal(record.role, ROLES.SUB_COMPANY); assert.equal(record.allocatedShare, requested.allocatedShare);
  assert.notEqual(record.password, plainPassword); assert.equal(await bcrypt.compare(plainPassword, record.password), true);
  assert.equal("password" in body.data, false); assert.equal("__v" in body.data, false); assert.notEqual(record.role, ROLES.USER);
});

for (const [label, field] of [["Username", "username"], ["Password", "password"], ["First name", "firstName"], ["Allocated share", "allocatedShare"]]) {
  test(`Missing ${label} is rejected`, { skip: !enabled }, async () => { const body = validBody(); delete body[field]; assert.equal((await create(superAdmin, body)).status, 400); });
}

test("Username shorter than minimum length is rejected", { skip: !enabled }, async () => assert.equal((await create(superAdmin, validBody({ username: "ab" }))).status, 400));
test("Username longer than maximum length is rejected", { skip: !enabled }, async () => assert.equal((await create(superAdmin, validBody({ username: "a".repeat(31) }))).status, 400));
test("Duplicate username is rejected", { skip: !enabled }, async () => assert.equal((await create(superAdmin, validBody({ username: created.username }))).status, 409));
test("Duplicate mobile is rejected", { skip: !enabled }, async () => assert.equal((await create(superAdmin, validBody({ mobile: created.mobile }))).status, 409));
test("Username is trimmed and converted to lowercase", { skip: !enabled }, async () => {
  const requested = ` TrimCompany${sequence} `; const body = await (await create(superAdmin, validBody({ username: requested }))).json(); assert.equal(body.data.username, requested.trim().toLowerCase());
});
test("Empty username is rejected", { skip: !enabled }, async () => assert.equal((await create(superAdmin, validBody({ username: "" }))).status, 400));
test("Username containing only spaces is rejected", { skip: !enabled }, async () => assert.equal((await create(superAdmin, validBody({ username: "   " }))).status, 400));
test("Invalid username characters are rejected", { skip: !enabled }, async () => assert.equal((await create(superAdmin, validBody({ username: "bad_user!" }))).status, 400));

test("Allocated share below 0, above 10000, decimal, and invalid values are rejected", { skip: !enabled }, async () => {
  for (const allocatedShare of [-1, 10001, 10.5, "bad"]) assert.equal((await create(superAdmin, validBody({ allocatedShare }))).status, 400);
});
test("Frontend role and parentId are ignored", { skip: !enabled }, async () => {
  const body = await (await create(superAdmin, validBody({ role: ROLES.SUPERADMIN, parentId: otherSuperAdmin._id }))).json();
  assert.equal(body.data.role, ROLES.SUB_COMPANY); assert.equal(String(body.data.parentId), String(superAdmin._id));
});
test("Super Admin lists only their own Sub Companies", { skip: !enabled }, async () => {
  await create(otherSuperAdmin, validBody()); const body = await (await fetch(`${baseUrl}/api/sub-companies`, { headers: auth(superAdmin) })).json();
  assert.ok(body.data.length > 0); assert.ok(body.data.every((item) => String(item.parentId) === String(superAdmin._id)));
});
test("Super Admin cannot suspend an unrelated Sub Company", { skip: !enabled }, async () => {
  const other = await (await create(otherSuperAdmin, validBody())).json(); assert.equal((await fetch(`${baseUrl}/api/sub-companies/${other.data._id}/status`, { method: "PATCH", headers: auth(superAdmin) })).status, 404);
});
test("Super Admin can suspend their own Sub Company", { skip: !enabled }, async () => {
  const response = await fetch(`${baseUrl}/api/sub-companies/${created._id}/status`, { method: "PATCH", headers: auth(superAdmin) }); const body = await response.json(); assert.equal(response.status, 200); assert.equal(body.data.isActive, false);
});
test("Existing Client creation API still works", { skip: !enabled }, async () => {
  const response = await fetch(`${baseUrl}/api/superadmin/users`, { method: "POST", headers: auth(superAdmin), body: JSON.stringify({ firstName: "Regression Client", password: "pass1234", confirmPassword: "pass1234", coins: 0 }) }); assert.equal(response.status, 201);
});
