#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { generateBettingSlip } from "../core/index.mjs";
import { fail, parseArgs, readJson } from "./audit-input.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultIssuePath = resolve(scriptDir, "../assets/sample-data/lottery-issue.json");
const usage =
  "Usage: node scripts/generate-lottery-slip.mjs --issue <issue.json> [--strategy balanced] [--budget 288]";
const args = parseArgs(process.argv.slice(2));

try {
  const issue = readJson(args.issue || defaultIssuePath);
  const budget = args.budget === undefined ? undefined : Number(args.budget);
  const slip = generateBettingSlip({
    issue,
    strategy: args.strategy ?? "balanced",
    budget,
    generatedAt: issue.generatedAt,
  });
  console.log(JSON.stringify(slip, null, 2));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error), usage);
}
