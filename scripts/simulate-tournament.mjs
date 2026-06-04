#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { applyContextAdjustments, simulateTournament } from "../core/index.mjs";
import { auditSnapshot, fail, parseArgs, readJson } from "./audit-input.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultDataPath = resolve(scriptDir, "../assets/sample-data/worldcup-2026.json");
const usage =
  "Usage: node scripts/simulate-tournament.mjs --data <audited-snapshot.json> [--simulations 10000] [--seed 2026]";
const args = parseArgs(process.argv.slice(2));

try {
  const snapshot = auditSnapshot(readJson(args.data || defaultDataPath));
  const simulationCount = Number(args.simulations ?? 10000);
  if (!Number.isInteger(simulationCount) || simulationCount <= 0) {
    throw new Error("--simulations must be a positive integer.");
  }

  const teamAdjustments = snapshot.contextAdjustments.filter((adjustment) => adjustment.scope === "team");
  const teams = teamAdjustments.length === 0
    ? snapshot.teams
    : snapshot.teams.map((team) =>
        applyContextAdjustments({
          team,
          role: "home",
          generatedAt: snapshot.metadata.generatedAt,
          contextAdjustments: teamAdjustments,
        }).team,
      );

  const simulation = simulateTournament({
    teams,
    matchStates: snapshot.matchStates,
    simulationCount,
    seed: args.seed ?? 2026,
    modelVersion: snapshot.metadata.modelVersion,
    dataVersion: snapshot.metadata.dataVersion,
    generatedAt: snapshot.metadata.generatedAt,
  });
  console.log(JSON.stringify(simulation, null, 2));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error), usage);
}
