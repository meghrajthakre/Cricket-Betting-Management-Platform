"use strict";

const percentile = (sortedValues, value) => {
  if (!sortedValues.length) return 0;
  const index = Math.min(
    sortedValues.length - 1,
    Math.ceil((value / 100) * sortedValues.length) - 1
  );
  return sortedValues[Math.max(0, index)];
};

async function runLoad({
  url,
  durationMs = 10_000,
  concurrency = 10,
  method = "GET",
  headers = {},
  body,
  requestTimeoutMs = 10_000,
}) {
  const normalizedMethod = String(method).toUpperCase();
  const deadline = Date.now() + durationMs;
  const latencies = [];
  const statuses = {};
  let completed = 0;
  let failed = 0;

  const worker = async () => {
    while (Date.now() < deadline) {
      const started = performance.now();
      try {
        const response = await fetch(url, {
          method: normalizedMethod,
          headers,
          body,
          signal: AbortSignal.timeout(requestTimeoutMs),
        });
        await response.arrayBuffer();
        statuses[response.status] = (statuses[response.status] || 0) + 1;
        if (!response.ok) failed += 1;
      } catch {
        failed += 1;
        statuses.NETWORK_ERROR = (statuses.NETWORK_ERROR || 0) + 1;
      } finally {
        latencies.push(performance.now() - started);
        completed += 1;
      }
    }
  };

  const startedAt = performance.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsedMs = performance.now() - startedAt;
  const sorted = latencies.sort((a, b) => a - b);

  return {
    completed,
    failed,
    errorRate: completed ? failed / completed : 1,
    requestsPerSecond: completed / (elapsedMs / 1000),
    latencyMs: {
      min: sorted[0] || 0,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      max: sorted[sorted.length - 1] || 0,
    },
    statuses,
  };
}

async function main() {
  const method = (process.env.LOAD_METHOD || "GET").toUpperCase();
  if (!["GET", "HEAD"].includes(method) && process.env.LOAD_ALLOW_WRITES !== "true") {
    throw new Error("Write load tests require LOAD_ALLOW_WRITES=true");
  }

  const token = process.env.LOAD_AUTH_TOKEN;
  const rawBody = process.env.LOAD_BODY;
  const summary = await runLoad({
    url: process.env.LOAD_URL || "http://localhost:5000/",
    durationMs: Number(process.env.LOAD_DURATION_SECONDS || 10) * 1000,
    concurrency: Number(process.env.LOAD_CONCURRENCY || 10),
    method,
    headers: {
      ...(rawBody ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: rawBody,
    requestTimeoutMs: Number(process.env.LOAD_REQUEST_TIMEOUT_MS || 10_000),
  });

  console.log(JSON.stringify(summary, null, 2));
  const maxErrorRate = Number(process.env.LOAD_MAX_ERROR_RATE || 0.01);
  if (summary.errorRate > maxErrorRate) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { runLoad };
