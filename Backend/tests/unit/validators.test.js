"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { paginationSchema, validateQuery } = require("../../src/utils/validators");

const responseStub = () => {
  const response = { statusCode: 200, body: null };
  response.status = (statusCode) => {
    response.statusCode = statusCode;
    return response;
  };
  response.json = (body) => {
    response.body = body;
    return response;
  };
  return response;
};

test("validateQuery supports Express 5 getter-only req.query", () => {
  const req = {};
  Object.defineProperty(req, "query", {
    get: () => ({ page: "2", limit: "20" }),
  });
  const res = responseStub();
  let nextCalled = false;

  validateQuery(paginationSchema)(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.validatedQuery, { page: 2, limit: 20 });
  assert.deepEqual(req.query, { page: "2", limit: "20" });
});

test("validateQuery returns 400 for invalid pagination", () => {
  const req = { query: { page: "0", limit: "101" } };
  const res = responseStub();
  let nextCalled = false;

  validateQuery(paginationSchema)(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Invalid query parameters");
});
