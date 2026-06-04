import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as skillCore from "../core/index.mjs";
import {
  auditSnapshot,
  dataVersionFromSources,
  reviewedContextAdjustments,
} from "../scripts/audit-input.mjs";

const skillDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readSample(name) {
  return JSON.parse(readFileSync(join(skillDir, "assets/sample-data", name), "utf8"));
}

function fixedMatchInput() {
  const snapshot = auditSnapshot(readSample("worldcup-2026.json"));
  return {
    snapshot,
    input: {
      matchId: "sample-group-a-1",
      homeTeam: snapshot.teams.find((team) => team.id === "MEX"),
      awayTeam: snapshot.teams.find((team) => team.id === "KOR"),
      stage: "group",
      modelVersion: snapshot.metadata.modelVersion,
      dataVersion: snapshot.metadata.dataVersion,
      generatedAt: snapshot.metadata.generatedAt,
      venueCountryCode: "MEX",
      contextAdjustments: snapshot.contextAdjustments,
    },
  };
}

test("repository contains the required skill and bilingual documentation", () => {
  for (const file of ["SKILL.md", "README.md", "README.en.md", "agents/openai.yaml", "LICENSE"]) {
    assert.equal(existsSync(join(skillDir, file)), true, `${file} is required`);
  }
});

test("bundled core files match the published manifest", () => {
  const manifest = JSON.parse(readFileSync(join(skillDir, "core/manifest.json"), "utf8"));
  for (const [file, expectedHash] of Object.entries(manifest.files)) {
    const content = readFileSync(join(skillDir, "core", file));
    assert.equal(createHash("sha256").update(content).digest("hex"), expectedHash, file);
  }
});

test("venue country controls host advantage", () => {
  const { input } = fixedMatchInput();
  const neutral = skillCore.predictMatch({ ...input, venueCountryCode: undefined });
  const hosted = skillCore.predictMatch(input);
  assert.ok(hosted.homeWin90Prob > neutral.homeWin90Prob);
});

test("completed official-format results remain locked and invalid participants fail", () => {
  const snapshot = auditSnapshot(readSample("synthetic-48-team.json"));
  const result = skillCore.simulateTournament({
    teams: snapshot.teams,
    matchStates: snapshot.matchStates,
    simulationCount: 5,
    seed: "locked-results",
  });
  assert.equal(result.completedMatchCount, 73);
  assert.equal(result.groupRankProbabilities.A.T01, 1);
  assert.equal(result.teamStageProbabilities.find((team) => team.teamId === "T02")?.qualify16Prob, 1);

  const invalidStates = snapshot.matchStates.map((state) =>
    state.matchNumber === 73 ? { ...state, awayTeamId: "T07" } : state,
  );
  assert.throws(
    () => skillCore.simulateTournament({
      teams: snapshot.teams,
      matchStates: invalidStates,
      simulationCount: 1,
      seed: "invalid-locked-result",
    }),
    /participants do not match the resolved bracket/,
  );
});

test("90-minute and advancement result scopes stay separate", () => {
  const { input } = fixedMatchInput();
  const result = skillCore.predictMatch({ ...input, stage: "round_of_32" });
  assert.equal(result.resultScope, "90minResult");
  assert.equal(result.advanceResultScope, "advanceResult");
  assert.ok(result.homeAdvanceProb > result.homeWin90Prob);
});

test("unreviewed LLM adjustments cannot affect skill predictions", () => {
  const { input } = fixedMatchInput();
  const llmAdjustment = {
    id: "llm-only",
    derivation: "llm_extraction",
    scope: "team",
    type: "injury",
    target: "home",
    teamCode: "MEX",
    title: "Unreviewed LLM claim",
    impact: { attackMultiplier: 0.1 },
  };
  const filtered = reviewedContextAdjustments([llmAdjustment]);
  assert.deepEqual(filtered, []);
  assert.deepEqual(
    skillCore.predictMatch({ ...input, contextAdjustments: filtered }),
    skillCore.predictMatch({ ...input, contextAdjustments: [] }),
  );
});

test("audit-only facts do not change dataVersion", () => {
  const snapshot = readSample("worldcup-2026.json");
  const version = dataVersionFromSources(
    snapshot.metadata.sourceVersions,
    snapshot.metadata.strengthSnapshotVersion,
  );
  const changedAuditFacts = { ...snapshot, officialFacts: [{ id: "changed-audit-only-fact" }] };
  assert.equal(
    dataVersionFromSources(
      changedAuditFacts.metadata.sourceVersions,
      changedAuditFacts.metadata.strengthSnapshotVersion,
    ),
    version,
  );
});

test("audited snapshots reject incomplete or mixed strength versions", () => {
  const snapshot = readSample("worldcup-2026.json");
  assert.throws(
    () => auditSnapshot({ ...snapshot, teams: snapshot.teams.slice(1) }),
    /expectedTeamCount must equal teams.length/,
  );
  assert.throws(
    () => auditSnapshot({
      ...snapshot,
      teams: snapshot.teams.map((team, index) =>
        index === 0 ? { ...team, strengthVersion: "mixed-version" } : team,
      ),
    }),
    /does not use strength version/,
  );
});

test("copied skill runs all three CLIs without the web app", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "worldcup-predictor-skill-"));
  const copiedSkill = join(tempRoot, "worldcup-predictor");
  cpSync(skillDir, copiedSkill, { recursive: true });

  try {
    const commands = [
      ["scripts/predict-match.mjs", "--home", "MEX", "--away", "KOR"],
      ["scripts/simulate-tournament.mjs", "--simulations", "2", "--seed", "standalone"],
      ["scripts/generate-lottery-slip.mjs", "--strategy", "balanced", "--budget", "288"],
    ];
    for (const command of commands) {
      const result = spawnSync(process.execPath, command, {
        cwd: copiedSkill,
        encoding: "utf8",
      });
      assert.equal(result.status, 0, result.stderr);
      assert.doesNotThrow(() => JSON.parse(result.stdout));
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
