"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getAccessTokenFromRequest,
  allowSelfOrRoles,
} = require("../../src/middleware/authMiddleware");

test("Bearer token is preferred over panel cookies", () => {
  const token = getAccessTokenFromRequest({
    headers: { authorization: "Bearer user-header-token" },
    cookies: {
      sa_accessToken: "superadmin-cookie",
      accessToken: "user-cookie",
    },
  });
  assert.equal(token, "user-header-token");
});

test("a single panel cookie remains a valid fallback", () => {
  const token = getAccessTokenFromRequest({
    headers: {},
    cookies: { accessToken: "user-cookie" },
  });
  assert.equal(token, "user-cookie");
});

test("ambiguous superadmin and user cookies are rejected", () => {
  assert.throws(
    () => getAccessTokenFromRequest({
      headers: {},
      cookies: {
        sa_accessToken: "superadmin-cookie",
        accessToken: "user-cookie",
      },
    }),
    (error) => error.statusCode === 401 && /Multiple login sessions/.test(error.message)
  );
});

test("malformed Authorization header cannot fall back to a cookie", () => {
  assert.throws(
    () => getAccessTokenFromRequest({
      headers: { authorization: "not-a-bearer-token" },
      cookies: { accessToken: "user-cookie" },
    }),
    (error) => error.statusCode === 401
  );
});

test("wallet ownership middleware allows self and superadmin only", () => {
  const middleware = allowSelfOrRoles("userId", "superadmin");
  const next = () => {};

  assert.doesNotThrow(() => middleware({
    params: { userId: "user-1" },
    user: { _id: { toString: () => "user-1" }, role: "user" },
  }, null, next));

  assert.doesNotThrow(() => middleware({
    params: { userId: "user-2" },
    user: { _id: { toString: () => "admin-1" }, role: "superadmin" },
  }, null, next));

  assert.throws(
    () => middleware({
      params: { userId: "user-2" },
      user: { _id: { toString: () => "user-1" }, role: "user" },
    }, null, next),
    (error) => error.statusCode === 403
  );
});
