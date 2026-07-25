"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { runLoad } = require("./http-load");

test("load runner reports throughput, latency, and successful statuses", async (t) => {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"ok":true}');
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const { port } = server.address();
  const result = await runLoad({
    url: `http://127.0.0.1:${port}/health`,
    durationMs: 200,
    concurrency: 2,
    requestTimeoutMs: 1_000,
  });

  assert.ok(result.completed > 0);
  assert.equal(result.failed, 0);
  assert.equal(result.statuses[200], result.completed);
  assert.ok(result.requestsPerSecond > 0);
  assert.ok(result.latencyMs.p95 >= 0);
});
