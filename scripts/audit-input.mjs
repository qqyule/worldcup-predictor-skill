import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const stages = new Set([
  "group",
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
]);
const statuses = new Set(["scheduled", "live", "final", "postponed"]);

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = value;
      index += 1;
    }
  }
  return args;
}

export function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
}

export function contentHash(value) {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

export function dataVersionFromSources(sourceVersions, strengthSnapshotVersion) {
  return `official-${contentHash({ ...sourceVersions, strength: strengthSnapshotVersion }).slice(0, 16)}`;
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value;
}

function validateScoreline(scoreline, field) {
  if (scoreline === undefined) return;
  if (
    !scoreline ||
    !Number.isInteger(scoreline.home) ||
    scoreline.home < 0 ||
    !Number.isInteger(scoreline.away) ||
    scoreline.away < 0
  ) {
    throw new Error(`${field} must contain non-negative integer home and away scores.`);
  }
}

function validateMatchStates(matchStates, teamIds) {
  const matchIds = new Set();
  for (const state of matchStates) {
    requiredString(state.matchId, "matchStates[].matchId");
    if (matchIds.has(state.matchId)) throw new Error(`Duplicate match state: ${state.matchId}.`);
    matchIds.add(state.matchId);
    if (!stages.has(state.stage)) throw new Error(`Invalid stage for match ${state.matchId}.`);
    if (!statuses.has(state.status)) throw new Error(`Invalid status for match ${state.matchId}.`);
    validateScoreline(state.actualScore90min, `${state.matchId}.actualScore90min`);
    validateScoreline(state.actualScoreExtraTime, `${state.matchId}.actualScoreExtraTime`);
    validateScoreline(state.penaltyScore, `${state.matchId}.penaltyScore`);
    if (state.status !== "final") continue;
    requiredString(state.homeTeamId, `${state.matchId}.homeTeamId`);
    requiredString(state.awayTeamId, `${state.matchId}.awayTeamId`);
    if (!teamIds.has(state.homeTeamId) || !teamIds.has(state.awayTeamId)) {
      throw new Error(`Completed match ${state.matchId} contains an unknown participant.`);
    }
    if (state.stage === "group" && !state.actualScore90min) {
      throw new Error(`Completed group match ${state.matchId} is missing actualScore90min.`);
    }
    if (state.stage !== "group" && !state.advanceTeamId) {
      throw new Error(`Completed knockout match ${state.matchId} is missing advanceTeamId.`);
    }
    if (state.stage !== "group" && ![state.homeTeamId, state.awayTeamId].includes(state.advanceTeamId)) {
      throw new Error(`Completed knockout match ${state.matchId} has an invalid advanceTeamId.`);
    }
  }
}

export function reviewedContextAdjustments(adjustments = []) {
  return adjustments.filter(
    (adjustment) =>
      adjustment.derivation === "manual_review" ||
      (
        adjustment.derivation === "deterministic_rule" &&
        typeof adjustment.ruleVersion === "string" &&
        adjustment.ruleVersion.length > 0
      ),
  );
}

export function auditSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") throw new Error("Snapshot must be a JSON object.");
  const metadata = snapshot.metadata;
  if (!metadata || typeof metadata !== "object") throw new Error("metadata is required.");

  requiredString(metadata.modelVersion, "metadata.modelVersion");
  requiredString(metadata.dataVersion, "metadata.dataVersion");
  requiredString(metadata.generatedAt, "metadata.generatedAt");
  const strengthSnapshotVersion = requiredString(
    metadata.strengthSnapshotVersion,
    "metadata.strengthSnapshotVersion",
  );
  if (!metadata.sourceVersions || typeof metadata.sourceVersions !== "object" || Array.isArray(metadata.sourceVersions)) {
    throw new Error("metadata.sourceVersions must be an object of prediction-input hashes.");
  }
  if (Object.keys(metadata.sourceVersions).length === 0) {
    throw new Error("metadata.sourceVersions must include at least one prediction input.");
  }
  for (const [source, version] of Object.entries(metadata.sourceVersions)) {
    requiredString(version, `metadata.sourceVersions.${source}`);
  }
  if ("strength" in metadata.sourceVersions) {
    throw new Error("metadata.sourceVersions must not contain strength; use metadata.strengthSnapshotVersion.");
  }

  if (!Array.isArray(snapshot.teams) || snapshot.teams.length === 0) {
    throw new Error("teams must contain at least one team.");
  }
  if (!Number.isInteger(metadata.expectedTeamCount) || metadata.expectedTeamCount !== snapshot.teams.length) {
    throw new Error("metadata.expectedTeamCount must equal teams.length.");
  }
  const teamIds = new Set();
  for (const team of snapshot.teams) {
    requiredString(team.id, "teams[].id");
    if (teamIds.has(team.id)) throw new Error(`Duplicate team id: ${team.id}.`);
    teamIds.add(team.id);
    if (team.strengthVersion !== strengthSnapshotVersion) {
      throw new Error(`Team ${team.id ?? "unknown"} does not use strength version ${strengthSnapshotVersion}.`);
    }
    if (!Number.isFinite(team.ratingValue) && !Number.isFinite(team.eloRating) && !Number.isFinite(team.fifaRank)) {
      throw new Error(`Team ${team.id ?? "unknown"} is missing a usable audited rating.`);
    }
  }

  const expectedDataVersion = dataVersionFromSources(metadata.sourceVersions, strengthSnapshotVersion);
  if (metadata.dataVersion !== expectedDataVersion) {
    throw new Error(`metadata.dataVersion must be ${expectedDataVersion}.`);
  }

  const matchStates = Array.isArray(snapshot.matchStates) ? snapshot.matchStates : [];
  validateMatchStates(matchStates, teamIds);

  return {
    ...snapshot,
    metadata,
    teams: snapshot.teams.map((team) => ({ ...team, isHost: false })),
    matchStates,
    contextAdjustments: reviewedContextAdjustments(snapshot.contextAdjustments),
  };
}

export function findTeam(teams, query) {
  const normalized = String(query ?? "").trim().toLowerCase();
  return teams.find((team) =>
    [team.id, team.code, team.name, team.englishName, team.countryCode]
      .filter(Boolean)
      .some((candidate) => String(candidate).trim().toLowerCase() === normalized),
  );
}

export function findMatchState(snapshot, homeTeam, awayTeam, matchId) {
  if (matchId) return snapshot.matchStates.find((state) => state.matchId === matchId);
  return snapshot.matchStates.find(
    (state) =>
      (state.homeTeamId === homeTeam.id && state.awayTeamId === awayTeam.id) ||
      (state.homeTeamId === awayTeam.id && state.awayTeamId === homeTeam.id),
  );
}

export function fail(message, usage) {
  console.error(message);
  if (usage) console.error(usage);
  process.exit(1);
}
