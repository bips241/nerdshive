#!/usr/bin/env node
/**
 * NerdShive Trace Log Query & Telemetry Inspector
 *
 * Usage:
 *   node tests/chaos-monkey/analyze-trace.js --status FAILURE
 *   node tests/chaos-monkey/analyze-trace.js --status GLITCH
 *   node tests/chaos-monkey/analyze-trace.js --user usr_0042
 *   node tests/chaos-monkey/analyze-trace.js --op post_create_code_sos
 *   node tests/chaos-monkey/analyze-trace.js --slow 100
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const jsonlPath = path.join(__dirname, '../reports/chaos-test-trace.jsonl');

async function main() {
  const args = process.argv.slice(2);
  const filterUser = getArg(args, '--user');
  const filterOp = getArg(args, '--op');
  const filterStatus = getArg(args, '--status');
  const filterSlow = parseFloat(getArg(args, '--slow') || '0');
  const limit = parseInt(getArg(args, '--limit') || '50', 10);

  if (!fs.existsSync(jsonlPath)) {
    console.error(`Trace log file not found at: ${jsonlPath}`);
    console.error(`Run "npm run test:chaos" first to generate telemetry.`);
    process.exit(1);
  }

  console.log(`🔍 Inspecting Chaos Trace Log: ${jsonlPath}`);
  console.log(`Filters -> User: ${filterUser || '*'}, Operation: ${filterOp || '*'}, Status: ${filterStatus || '*'}, Min Latency: ${filterSlow}ms\n`);

  const fileStream = fs.createReadStream(jsonlPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let matched = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);

      if (filterUser && record.userId !== filterUser) continue;
      if (filterOp && !record.operation.includes(filterOp)) continue;
      if (filterStatus && record.status !== filterStatus) continue;
      if (filterSlow > 0 && record.durationMs < filterSlow) continue;

      matched++;
      console.log(`[${record.status}] ${record.timestamp} | Trace: ${record.traceId}`);
      console.log(`  User: ${record.userId} | Op: ${record.operation} (${record.category}) | ${record.durationMs}ms`);
      if (record.error) {
        console.log(`  ❌ Error: ${record.error}`);
      }
      if (record.metadata && Object.keys(record.metadata).length > 0) {
        console.log(`  📦 Metadata:`, JSON.stringify(record.metadata));
      }
      console.log('');

      if (matched >= limit) {
        console.log(`⚠️ Reached display limit of ${limit} records. Specify --limit <N> for more.`);
        break;
      }
    } catch (e) {
      // ignore parse error
    }
  }

  if (matched === 0) {
    console.log(`✅ No records matched the specified filters.`);
  } else {
    console.log(`Showing ${matched} matched records.`);
  }
}

function getArg(args, flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return null;
}

main().catch(console.error);
