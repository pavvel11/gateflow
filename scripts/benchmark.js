#!/usr/bin/env node

/**
 * GateFlow Performance Benchmark Script
 *
 * Usage:
 *   node scripts/benchmark.js [URL] [CONNECTIONS]
 *
 * Examples:
 *   node scripts/benchmark.js                                    # localhost, 50 connections
 *   node scripts/benchmark.js http://localhost:3000              # localhost, 50 connections
 *   node scripts/benchmark.js https://gf.techskills.academy     # production, 50 connections
 *   node scripts/benchmark.js https://gf.techskills.academy 5   # production, 5 connections (small VPS)
 */

const autocannon = require('autocannon');

const TARGET_URL = process.argv[2] || 'http://localhost:3000';
const CONNECTIONS = parseInt(process.argv[3], 10) || 50;

// Test scenarios - adjust paths based on your actual product slugs
const scenarios = [
  {
    name: 'Homepage',
    path: '/',
    connections: CONNECTIONS,
    duration: 10,
  },
  {
    name: 'About Page',
    path: '/about',
    connections: CONNECTIONS,
    duration: 10,
  },
];

console.log('\n🚀 GateFlow Performance Benchmark');
console.log('================================\n');
console.log(`Target:      ${TARGET_URL}`);
console.log(`Connections: ${CONNECTIONS}\n`);

async function runBenchmark(scenario) {
  console.log(`\n📊 Testing: ${scenario.name}`);
  console.log('─'.repeat(50));

  const result = await autocannon({
    url: `${TARGET_URL}${scenario.path}`,
    connections: scenario.connections,
    duration: scenario.duration,
    pipelining: 1,
  });

  const { requests, latency, throughput, errors } = result;

  // Verdicts based on BACKLOG.md benchmarks
  const latencyVerdict =
    latency.mean < 500 ? '🟢 Excellent' :
    latency.mean < 1000 ? '🟡 Good' :
    latency.mean < 2000 ? '🟠 Slow' : '🔴 Very Slow';

  const reqSecVerdict =
    requests.mean > 100 ? '🟢 Excellent' :
    requests.mean > 50 ? '🟡 Good' :
    requests.mean > 20 ? '🟠 Needs Work' : '🔴 Critical';

  console.log(`\nResults:`);
  console.log(`  Requests/sec:    ${requests.mean.toFixed(2)} ${reqSecVerdict}`);
  console.log(`  Latency (avg):   ${latency.mean.toFixed(2)}ms ${latencyVerdict}`);
  console.log(`  Latency (p50):   ${latency.p50.toFixed(2)}ms`);
  console.log(`  Latency (p99):   ${latency.p99.toFixed(2)}ms`);
  console.log(`  Throughput:      ${(throughput.mean / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(`  Errors:          ${errors}`);

  return result;
}

async function main() {
  const results = [];

  for (const scenario of scenarios) {
    const result = await runBenchmark(scenario);
    results.push({ ...scenario, result });
  }

  // Summary
  console.log('\n\n📈 SUMMARY');
  console.log('================================\n');

  const avgReqSec = results.reduce((acc, r) => acc + r.result.requests.mean, 0) / results.length;
  const avgLatency = results.reduce((acc, r) => acc + r.result.latency.mean, 0) / results.length;

  console.log(`Average across all pages:`);
  console.log(`  Requests/sec: ${avgReqSec.toFixed(2)}`);
  console.log(`  Latency:      ${avgLatency.toFixed(2)}ms`);

  // Overall verdict
  const overallVerdict = avgLatency < 1000 && avgReqSec > 50 ? '🟢 PASS' : '🔴 NEEDS IMPROVEMENT';
  console.log(`\n${overallVerdict}\n`);

  // Comparison with baselines (from BACKLOG.md)
  console.log('Reference Baselines (from Jan 14, 2026):');
  console.log('  Local (M1 Max):  244 req/sec, ~200ms latency');
  console.log('  Small VPS:       ~11 req/sec, ~3.8s latency (BEFORE optimization)');
  console.log('  Target (VPS):    >100 req/sec, <500ms latency (AFTER ISR)\n');

  // Exit code based on performance
  const isCritical = avgLatency > 2000 || avgReqSec < 20;
  process.exit(isCritical ? 1 : 0);
}

main().catch((error) => {
  console.error('\n❌ Benchmark failed:', error.message);
  process.exit(1);
});
