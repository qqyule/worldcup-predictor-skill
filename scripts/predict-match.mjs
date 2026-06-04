#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { predictMatch } from "../core/index.mjs";
import { auditSnapshot, fail, findMatchState, findTeam, parseArgs, readJson } from "./audit-input.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultDataPath = resolve(scriptDir, "../assets/sample-data/worldcup-2026.json");
const usage =
  "Usage: node scripts/predict-match.mjs --home FRA --away BRA --data <audited-snapshot.json> [--match match-id] [--stage group] [--venue-country USA]";
const args = parseArgs(process.argv.slice(2));

if (args.help || !args.home || !args.away) fail("Missing required --home or --away argument.", usage);

try {
  const snapshot = auditSnapshot(readJson(args.data || defaultDataPath));
  const homeTeam = findTeam(snapshot.teams, args.home);
  const awayTeam = findTeam(snapshot.teams, args.away);
  if (!homeTeam) throw new Error(`Home team not found: ${args.home}`);
  if (!awayTeam) throw new Error(`Away team not found: ${args.away}`);
  if (homeTeam.id === awayTeam.id) throw new Error("Home and away teams must be different.");

  const matchState = findMatchState(snapshot, homeTeam, awayTeam, args.match);
  const prediction = predictMatch({
    matchId: args.match || matchState?.matchId,
    homeTeam,
    awayTeam,
    stage: args.stage || matchState?.stage,
    modelVersion: snapshot.metadata.modelVersion,
    dataVersion: snapshot.metadata.dataVersion,
    generatedAt: snapshot.metadata.generatedAt,
    venueCountryCode: args["venue-country"] || matchState?.venueCountryCode,
    contextAdjustments: snapshot.contextAdjustments,
  });
  console.log(JSON.stringify(prediction, null, 2));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error), usage);
}
